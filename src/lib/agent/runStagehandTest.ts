import * as Sentry from "@sentry/nextjs";
import type { FailureCategory, OracleType, Persona, RunMode } from "@prisma/client";
import { evaluateOracle } from "@/lib/oracle/evaluateOracle";
import { withSentrySpan } from "@/lib/sentry/withSentrySpan";

type StagehandPage = {
  goto: (url: string, options?: { waitUntil?: string; timeout?: number }) => Promise<unknown>;
  setViewportSize?: (size: { width: number; height: number }) => Promise<void>;
  waitForLoadState?: (state?: "load" | "domcontentloaded" | "networkidle", options?: { timeout?: number }) => Promise<void>;
  waitForTimeout?: (ms: number) => Promise<void>;
  goBack?: (options?: { waitUntil?: string; timeout?: number }) => Promise<unknown>;
  context?: () => {
    setExtraHTTPHeaders?: (headers: Record<string, string>) => Promise<void>;
  };
  keyboard?: {
    press: (key: string) => Promise<void>;
  };
  act: (instruction: string) => Promise<unknown>;
  locator: (selector: string) => {
    count: () => Promise<number>;
    innerText?: (options?: { timeout?: number }) => Promise<string>;
    fill?: (value: string, options?: { timeout?: number }) => Promise<void>;
    click?: (options?: { timeout?: number; noWaitAfter?: boolean }) => Promise<void>;
  };
  url: () => string;
  screenshot?: (options?: { path?: string; fullPage?: boolean }) => Promise<Buffer>;
};

type StagehandInstance = {
  init: () => Promise<void>;
  close: () => Promise<void>;
  page: StagehandPage;
  agent?: (options?: {
    executionModel?: string;
    instructions?: string;
  }) => {
    execute: (instructionOrOptions: {
      instruction: string;
      maxSteps?: number;
      autoScreenshot?: boolean;
      waitBetweenActions?: number;
    }) => Promise<unknown>;
  };
  sessionId?: string;
  browserbaseSessionId?: string;
  browserbaseSessionID?: string;
};

type StagehandLogLine = {
  category?: string;
  message: string;
  level?: number;
  timestamp?: string;
  auxiliary?: Record<string, { value: string; type: string }>;
};

export type StagehandTestInput = {
  mode: RunMode;
  targetUrl: string;
  taskGoal: string;
  persona: Pick<Persona, "key" | "name" | "behaviorPrompt">;
  oracle: {
    type: OracleType;
    value: string;
  };
  runId: string;
  testCaseId: string;
};

export type ActionTraceStep = {
  stepNumber: number;
  chosenAction: string;
  urlAfterAction: string;
  personaRule: string;
  oracleResult: "PASS" | "FAIL";
  failureReason: string | null;
  screenshotUrl: string | null;
};

export type TestCaseResult = {
  status: "PASS" | "FAIL" | "ERROR";
  score: number;
  failureReason: string | null;
  failureCategory: FailureCategory | null;
  browserbaseSessionId: string | null;
  browserbaseSessionUrl: string | null;
  sentryTraceId: string | null;
  durationMs: number;
  agentSummary: string;
  finalUrl: string | null;
  finalTextSample: string | null;
  screenshotUrl: string | null;
  actionTrace: ActionTraceStep[];
  rawLogs: unknown[];
};

export async function runStagehandTest(input: StagehandTestInput): Promise<TestCaseResult> {
  const startedAt = Date.now();
  const traceId = Sentry.getActiveSpan()?.spanContext().traceId ?? null;
  const model = process.env.DEFAULT_STAGEHAND_MODEL || "google/gemini-3.5-flash";
  const logs: unknown[] = [];
  let stagehand: StagehandInstance | null = null;
  let finalUrl: string | null = null;
  let finalTextSample: string | null = null;
  let screenshotUrl: string | null = null;
  let browserbaseSessionId: string | null = null;
  let actionTrace: ActionTraceStep[] = [];

  return withSentrySpan(
    "persona_test_case",
    {
      "run.id": input.runId,
      "test_case.id": input.testCaseId,
      "persona.key": input.persona.key,
      "run.mode": input.mode,
      "target.url": input.targetUrl,
      "oracle.type": input.oracle.type
    },
    async () => {
      Sentry.setTags({
        run_id: input.runId,
        persona: input.persona.key,
        oracle_type: input.oracle.type
      });

      try {
        if (!process.env.BROWSERBASE_API_KEY) {
          throw new Error("BROWSERBASE_API_KEY is not configured.");
        }

        const { Stagehand } = (await import("@browserbasehq/stagehand")) as unknown as {
          Stagehand: new (config: {
            env: "BROWSERBASE";
            apiKey?: string;
            projectId?: string;
            modelName: string;
            modelClientOptions?: { apiKey?: string };
            logger?: (logLine: StagehandLogLine) => void;
            disablePino?: boolean;
          }) => StagehandInstance;
        };

        stagehand = await withSentrySpan(
          "browserbase.stagehand.init",
          { "gen_ai.request.model": model },
          async () => {
            const instance = new Stagehand({
              env: "BROWSERBASE",
              apiKey: process.env.BROWSERBASE_API_KEY,
              projectId: process.env.BROWSERBASE_PROJECT_ID,
              modelName: model,
              modelClientOptions: {
                apiKey: getModelApiKey()
              },
              disablePino: true,
              logger: (logLine) => {
                logs.push({
                  type: "stagehand_log",
                  category: logLine.category,
                  level: logLine.level,
                  message: logLine.message,
                  auxiliary: redactAuxiliary(logLine.auxiliary)
                });
              }
            });
            await instance.init();
            return instance;
          }
        );

        browserbaseSessionId = getBrowserbaseSessionId(stagehand);
        if (browserbaseSessionId) {
          Sentry.setTag("browserbase_session_id", browserbaseSessionId);
        }

        const page = stagehand.page;
        if (!page) {
          throw new Error("Stagehand did not expose a browser page.");
        }
        const activeStagehand = stagehand;

        if (input.persona.key === "mobile-first" && page.setViewportSize) {
          await page.setViewportSize({ width: 390, height: 844 });
        }

        await withSentrySpan(
          "browserbase.stagehand.navigate",
          {
            "target.url": input.targetUrl,
            "browserbase.session_id": browserbaseSessionId
          },
          async () => {
            await prepareTunnelHeaders(page, input.targetUrl, logs);
            await page.goto(input.targetUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
          }
        );

        await dismissLocalTunnelInterstitial(page, input.targetUrl, logs);

        if (input.mode === "DEMO_SAFE") {
          const demoResult = await executeDemoSafePolicy(page, input, logs);
          actionTrace = demoResult.actionTrace;
        } else {
          const instruction = buildInstruction(input);
          const actResult = await Sentry.startSpan(
            {
              name: "invoke_agent PersonaProbe Stagehand",
              op: "gen_ai.invoke_agent",
              attributes: {
                "gen_ai.request.model": model,
                "gen_ai.agent.name": "PersonaProbe Stagehand",
                "persona.key": input.persona.key,
                "run.id": input.runId,
                "test_case.id": input.testCaseId
              }
            },
            async () =>
              withSentrySpan(
                "browserbase.stagehand.agent",
                {
                  "persona.key": input.persona.key,
                  "task.length": input.taskGoal.length
                },
                async () => executePersonaTask(activeStagehand, page, instruction, model, input)
              )
          );
          logs.push({ type: "agent_result", value: summarizeUnknown(actResult) });
        }

        finalUrl = page.url();
        finalTextSample = await extractTextSample(page);
        screenshotUrl = actionTrace.at(-1)?.screenshotUrl ?? (await captureScreenshotDataUrl(page));

        const oracleResult = await evaluateOracle({
          type: input.oracle.type,
          value: input.oracle.value,
          page,
          finalTextSample
        });
        const failureCategory = oracleResult.passed
          ? null
          : classifyFailure({
              mode: input.mode,
              failureReason: oracleResult.failureReason,
              finalTextSample,
              logs,
              personaKey: input.persona.key,
              actionTrace
            });

        if (!actionTrace.length || input.mode === "REAL_WEBSITE") {
          actionTrace.push({
            stepNumber: actionTrace.length + 1,
            chosenAction:
              input.mode === "REAL_WEBSITE"
                ? "Run Browserbase/Stagehand agent with persona policy"
                : "Evaluate final page state",
            urlAfterAction: finalUrl,
            personaRule: input.persona.behaviorPrompt,
            oracleResult: oracleResult.passed ? "PASS" : "FAIL",
            failureReason: oracleResult.failureReason,
            screenshotUrl
          });
        }

        return {
          status: oracleResult.passed ? "PASS" : "FAIL",
          score: oracleResult.score,
          failureReason: oracleResult.failureReason,
          failureCategory,
          browserbaseSessionId,
          browserbaseSessionUrl: browserbaseSessionId
            ? `https://browserbase.com/sessions/${browserbaseSessionId}`
            : null,
          sentryTraceId: traceId,
          durationMs: Date.now() - startedAt,
          agentSummary: oracleResult.passed
            ? "The persona-conditioned agent completed the task according to the configured oracle."
            : summarizeFailureCategory(failureCategory),
          finalUrl,
          finalTextSample,
          screenshotUrl,
          actionTrace,
          rawLogs: truncateLogs(logs)
        };
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            run_id: input.runId,
            persona: input.persona.key,
            oracle_type: input.oracle.type
          }
        });

        return {
          status: "ERROR",
          score: 0,
          failureReason: error instanceof Error ? error.message : "Unknown Stagehand error.",
          failureCategory: classifyError(error),
          browserbaseSessionId,
          browserbaseSessionUrl: browserbaseSessionId
            ? `https://browserbase.com/sessions/${browserbaseSessionId}`
            : null,
          sentryTraceId: traceId,
          durationMs: Date.now() - startedAt,
          agentSummary: "The test case errored before it could be judged.",
          finalUrl,
          finalTextSample,
          screenshotUrl,
          actionTrace,
          rawLogs: truncateLogs(logs)
        };
      } finally {
        if (stagehand) {
          await stagehand.close().catch((error) => {
            Sentry.captureException(error);
          });
        }
      }
    }
  );
}

async function executeDemoSafePolicy(page: StagehandPage, input: StagehandTestInput, logs: unknown[]) {
  const actionTrace: ActionTraceStep[] = [];
  const personaKey = input.persona.key;
  const isSelfHealedTarget = page.url().includes("/account-settings-healed") || page.url().includes("heal=");

  logs.push({
    type: "demo_safe_policy",
    persona: personaKey,
    policy: input.persona.behaviorPrompt,
    selfHealed: isSelfHealedTarget
  });

  if (isSelfHealedTarget) {
    return executeSelfHealedDemoPolicy(page, input, actionTrace);
  }

  if (personaKey === "impatient") {
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: 'Click "Looks fine" in the privacy modal',
      personaRule: "Clicks the first plausible button; does not tune privacy settings.",
      action: () => clickByTestId(page, "modal-allow")
    });
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: "Fill the first plausible email field: Billing email = test@example.com",
      personaRule: "Clicks the first plausible field and does not inspect competing labels.",
      action: () => fillByTestId(page, "billing-email", "test@example.com")
    });
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: 'Click vague "Save preferences" button',
      personaRule: "Max retries is 0, so one save attempt decides the outcome.",
      action: () => clickByTestId(page, "save-preferences"),
      fallbackFailureReason: "Persona changed billing email instead of account email, then gave up after the vague error."
    });
    return { actionTrace };
  }

  if (personaKey === "privacy-sensitive") {
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: 'Click "Use essentials only" in the privacy modal',
      personaRule: "Refuses tracking and optional permissions before touching the form.",
      action: () => clickByTestId(page, "modal-reject")
    });
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: "Fill only required Account email = test@example.com",
      personaRule: "Provides required account email and avoids optional phone number.",
      action: () => fillByTestId(page, "account-email", "test@example.com")
    });
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: "Turn off prechecked newsletter",
      personaRule: "Refuses newsletters and partner updates.",
      action: () => clickByTestId(page, "newsletter-checkbox")
    });
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: 'Click "Save preferences"',
      personaRule: "Saves only after optional communications and permissions are refused.",
      action: () => clickByTestId(page, "save-preferences")
    });
    return { actionTrace };
  }

  if (personaKey === "esl") {
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: 'Click "Looks fine" in the privacy modal',
      personaRule: "Prefers the simpler affirmative button text.",
      action: () => clickByTestId(page, "modal-allow")
    });
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: "Fill Billing email = test@example.com",
      personaRule: "May confuse billing email and account email when both use similar wording.",
      action: () => fillByTestId(page, "billing-email", "test@example.com")
    });
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: 'Click "Save preferences"',
      personaRule: "Vague button text does not clarify which email will be updated.",
      action: () => clickByTestId(page, "save-preferences"),
      fallbackFailureReason: "Persona confused the billing email field for the account email field."
    });
    return { actionTrace };
  }

  if (personaKey === "mobile-first") {
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: 'Tap "Looks fine" in the privacy modal',
      personaRule: "Uses obvious visible touch targets in a 390x844 viewport.",
      action: () => clickByTestId(page, "modal-allow")
    });
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: "Fill visible Account email field = test@example.com",
      personaRule: "Uses touch-sized fields but does not hunt for controls below the fold.",
      action: () => fillByTestId(page, "account-email", "test@example.com")
    });
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: "Stop before saving because the important button is below the mobile fold",
      personaRule: "Only obvious visible touch targets are used; no below-fold hunt without a visible cue.",
      action: async () => undefined,
      fallbackFailureReason: "The save button was not an obvious visible mobile touch target."
    });
    return { actionTrace };
  }

  if (personaKey === "adversarial" || personaKey === "adversarial-edge") {
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: 'Click "Use essentials only", then change choices later',
      personaRule: "Starts by refusing optional permissions.",
      action: () => clickByTestId(page, "modal-reject")
    });
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: "Fill invalid Account email = not-an-email",
      personaRule: "Tries one invalid input first.",
      action: () => fillByTestId(page, "account-email", "not-an-email")
    });
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: 'Click vague "Save preferences" with invalid input',
      personaRule: "Probes vague validation before completing.",
      action: () => clickByTestId(page, "save-preferences")
    });
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: "Use browser back navigation once",
      personaRule: "Uses back navigation once and changes direction mid-flow.",
      action: async () => {
        await page.goBack?.({ waitUntil: "domcontentloaded", timeout: 5_000 }).catch(() => undefined);
      },
      fallbackFailureReason: "Back navigation interrupted the task after an invalid-input probe."
    });
    return { actionTrace };
  }

  if (personaKey === "power-user") {
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: "Dismiss optional permissions with essentials-only choice",
      personaRule: "Avoids nonessential prompts quickly before using direct navigation.",
      action: () => clickByTestId(page, "modal-reject")
    });
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: "Press / shortcut, then search settings for email",
      personaRule: "Uses keyboard shortcuts and search to narrow the relevant setting.",
      action: async () => {
        await page.keyboard?.press("/").catch(() => undefined);
        await fillByTestId(page, "settings-search", "email");
      }
    });
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: "Fill Account email directly = test@example.com",
      personaRule: "Targets the exact field and skips optional personal data.",
      action: () => fillByTestId(page, "account-email", "test@example.com")
    });
    await recordDemoStep({
      page,
      input,
      trace: actionTrace,
      chosenAction: 'Click "Save preferences"',
      personaRule: "Completes efficiently once the exact target field is changed.",
      action: () => clickByTestId(page, "save-preferences")
    });
    return { actionTrace };
  }

  await recordDemoStep({
    page,
    input,
    trace: actionTrace,
    chosenAction: "Run fallback Stagehand action for unsupported persona",
    personaRule: input.persona.behaviorPrompt,
    action: () => page.act(buildInstruction(input))
  });
  return { actionTrace };
}

async function executeSelfHealedDemoPolicy(page: StagehandPage, input: StagehandTestInput, actionTrace: ActionTraceStep[]) {
  const personaRule = getSelfHealedPersonaRule(input.persona.key, input.persona.behaviorPrompt);

  await recordDemoStep({
    page,
    input,
    trace: actionTrace,
    chosenAction: "Use the repaired single Account email field",
    personaRule,
    action: () => fillByTestId(page, "account-email", "test@example.com")
  });

  await recordDemoStep({
    page,
    input,
    trace: actionTrace,
    chosenAction: 'Click explicit "Update account email" button',
    personaRule: "Self-heal made the primary action explicit, visible on mobile, and specific to the task.",
    action: () => clickByTestId(page, "save-preferences")
  });

  return { actionTrace };
}

function getSelfHealedPersonaRule(personaKey: string, fallback: string) {
  if (personaKey === "impatient") {
    return "Self-heal removed competing email fields, so the first plausible email field is now correct.";
  }
  if (personaKey === "privacy-sensitive") {
    return "Self-heal removed permission modal, tracking defaults, and unnecessary personal-data fields.";
  }
  if (personaKey === "esl") {
    return "Self-heal replaced ambiguous billing/account choices with one simple Account email label.";
  }
  if (personaKey === "mobile-first") {
    return "Self-heal keeps the important update button visible as an obvious touch target.";
  }
  if (personaKey === "adversarial" || personaKey === "adversarial-edge") {
    return "Self-heal gives a specific validation message and a direct recovery path after invalid input.";
  }
  if (personaKey === "power-user") {
    return "Self-heal keeps the shortest direct path available without extra search or modal work.";
  }
  return fallback;
}

async function recordDemoStep({
  page,
  input,
  trace,
  chosenAction,
  personaRule,
  action,
  fallbackFailureReason
}: {
  page: StagehandPage;
  input: StagehandTestInput;
  trace: ActionTraceStep[];
  chosenAction: string;
  personaRule: string;
  action: () => Promise<unknown>;
  fallbackFailureReason?: string;
}) {
  await action();
  await page.waitForTimeout?.(300).catch(() => undefined);

  const finalTextSample = await extractTextSample(page);
  const oracleResult = await evaluateOracle({
    type: input.oracle.type,
    value: input.oracle.value,
    page,
    finalTextSample
  });

  trace.push({
    stepNumber: trace.length + 1,
    chosenAction,
    urlAfterAction: page.url(),
    personaRule,
    oracleResult: oracleResult.passed ? "PASS" : "FAIL",
    failureReason: oracleResult.passed ? null : fallbackFailureReason || oracleResult.failureReason,
    screenshotUrl: await captureScreenshotDataUrl(page)
  });
}

async function clickByTestId(page: StagehandPage, testId: string) {
  const button = page.locator(`[data-testid="${testId}"]`);
  if (!button.click) throw new Error(`Target ${testId} is not clickable.`);
  await button.click({ timeout: 6_000 });
}

async function fillByTestId(page: StagehandPage, testId: string, value: string) {
  const field = page.locator(`[data-testid="${testId}"]`);
  if (!field.fill) throw new Error(`Target ${testId} is not fillable.`);
  await field.fill(value, { timeout: 6_000 });
}

function buildInstruction(input: StagehandTestInput) {
  return `You are testing whether an AI browser agent can complete this UI task under a specific user persona.

Persona:
${input.persona.name}
${input.persona.behaviorPrompt}

Task:
${input.taskGoal}

Rules:
- Complete the task as this persona would.
- Do not invent success.
- If blocked, describe exactly where and why.
- Be honest about uncertainty.
- Stop when the task is completed or clearly blocked.`;
}

async function executePersonaTask(
  stagehand: StagehandInstance,
  page: StagehandPage,
  instruction: string,
  model: string,
  input: StagehandTestInput
) {
  if (model.startsWith("google/")) {
    return executeActSequence(page, instruction, input);
  }

  if (stagehand.agent) {
    const agent = stagehand.agent({
      executionModel: model,
      instructions:
        "You are a browser automation agent. Complete the requested task end-to-end. Do not stop after a single field edit if more clicks or form submissions are required."
    });

    return agent.execute({
      instruction,
      maxSteps: 8,
      autoScreenshot: true,
      waitBetweenActions: 400
    });
  }

  return page.act(instruction);
}

async function executeActSequence(page: StagehandPage, instruction: string, input: StagehandTestInput) {
  const actions: unknown[] = [];
  const prompts = [
    `${instruction}

Step focus:
- Identify the fields needed for the task.
- Fill the account email field with test@example.com when an account email is requested.
- Perform exactly one useful browser action, then stop.`,
    `${instruction}

Step focus:
- Continue from the current page state.
- If a form is filled, click the primary control that advances the flow.
- If there are duplicate Continue buttons, click the last/rightmost Continue button, not the first/leftmost one.
- Prefer the enabled primary/darker button that actually validates or advances the form.
- Perform exactly one useful browser action, then stop.`,
    `${instruction}

Step focus:
- Continue from the current page state.
- If you are on a review screen, click the final save, submit, update, or confirmation control.
- Perform exactly one useful browser action, then stop.`,
    `${instruction}

Step focus:
- If the task is still incomplete, take the next single most useful action toward the success criteria.
- Stop if the task is already complete or blocked.`
  ];

  for (const prompt of prompts) {
    if (await isOracleProbablySatisfied(page, input)) {
      break;
    }

    const result = await page.act(prompt);
    actions.push(result);
  }

  return {
    success: await isOracleProbablySatisfied(page, input),
    mode: "sequential_act",
    actions
  };
}

async function isOracleProbablySatisfied(page: StagehandPage, input: StagehandTestInput) {
  const expected = input.oracle.value.toLowerCase();

  if (input.oracle.type === "URL_CONTAINS") {
    return page.url().toLowerCase().includes(expected);
  }

  if (input.oracle.type === "TEXT_CONTAINS" || input.oracle.type === "LLM_JUDGE") {
    const pageText = await extractTextSample(page);
    return pageText.toLowerCase().includes(expected);
  }

  if (input.oracle.type === "SELECTOR_EXISTS") {
    return (await page.locator(input.oracle.value).count()) > 0;
  }

  return false;
}

async function extractTextSample(page: StagehandPage) {
  try {
    const text = await page.locator("body").innerText?.({ timeout: 3_000 });
    return truncateText(text || "", 4000);
  } catch {
    return "";
  }
}

async function captureScreenshotDataUrl(page: StagehandPage) {
  if (!page.screenshot) return null;

  try {
    const buffer = await page.screenshot({ fullPage: false });
    const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
    return dataUrl.length > 180_000 ? null : dataUrl;
  } catch {
    return null;
  }
}

function classifyFailure({
  mode,
  failureReason,
  finalTextSample,
  logs,
  personaKey,
  actionTrace
}: {
  mode: RunMode;
  failureReason: string | null;
  finalTextSample: string | null;
  logs: unknown[];
  personaKey: string;
  actionTrace: ActionTraceStep[];
}): FailureCategory {
  const haystack = [failureReason, finalTextSample, ...logs.map((log) => summarizeUnknown(log))]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

  if (containsBotBlockSignal(haystack)) return "BOT_BLOCKED";
  if (haystack.includes("timeout") || haystack.includes("timed out")) return "TIMEOUT";
  if (containsInfraSignal(haystack)) return "INFRA_FAILURE";
  if (failureReason?.toLowerCase().includes("success criteria")) return "ORACLE_FAILURE";

  if (mode === "DEMO_SAFE") {
    if (personaKey === "mobile-first") return "UI_AMBIGUITY";
    if (personaKey === "impatient" || personaKey === "esl" || personaKey === "adversarial" || personaKey === "adversarial-edge") {
      return "PERSONA_FAILURE";
    }
    if (actionTrace.some((step) => step.chosenAction.toLowerCase().includes("vague"))) return "UI_AMBIGUITY";
    return "PERSONA_FAILURE";
  }

  if (haystack.includes("ambiguous") || haystack.includes("not obvious") || haystack.includes("unclear")) {
    return "UI_AMBIGUITY";
  }

  if (failureReason) return "AGENT_FAILURE";
  return "UNKNOWN";
}

function classifyError(error: unknown): FailureCategory {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (containsBotBlockSignal(message)) return "BOT_BLOCKED";
  if (message.includes("timeout") || message.includes("timed out")) return "TIMEOUT";
  if (containsInfraSignal(message)) return "INFRA_FAILURE";
  return "UNKNOWN";
}

function containsBotBlockSignal(value: string) {
  return [
    "captcha",
    "cloudflare",
    "access denied",
    "are you human",
    "verify you are human",
    "bot detection",
    "request blocked",
    "browser blocked"
  ].some((signal) => value.includes(signal));
}

function containsInfraSignal(value: string) {
  return [
    "browserbase_api_key",
    "browserbase",
    "stagehand did not expose",
    "project_id",
    "network",
    "dns",
    "econn",
    "enotfound",
    "socket"
  ].some((signal) => value.includes(signal));
}

function summarizeFailureCategory(category: FailureCategory | null) {
  if (category === "PERSONA_FAILURE") return "The persona policy led to choices that did not satisfy the oracle.";
  if (category === "AGENT_FAILURE") return "The browser agent failed to complete the task despite an executable persona policy.";
  if (category === "UI_AMBIGUITY") return "The UI made the next correct action ambiguous for this persona.";
  if (category === "BOT_BLOCKED") return "The target appeared to block or challenge browser automation.";
  if (category === "TIMEOUT") return "The run timed out before the oracle could be satisfied.";
  if (category === "INFRA_FAILURE") return "Browserbase, network, or runtime infrastructure prevented a fair persona result.";
  if (category === "ORACLE_FAILURE") return "The success oracle could not make a valid determination.";
  return "The run failed for an unknown reason.";
}

async function dismissLocalTunnelInterstitial(page: StagehandPage, targetUrl: string, logs: unknown[]) {
  const hostname = new URL(targetUrl).hostname;
  if (!hostname.endsWith(".loca.lt")) return;

  const pageText = await extractTextSample(page);
  if (!isLocalTunnelInterstitial(pageText)) {
    return;
  }

  const tunnelIp = pageText.match(/hosted by:\s*((?:\d{1,3}\.){3}\d{1,3})/i)?.[1];
  if (!tunnelIp) {
    logs.push({
      type: "localtunnel_interstitial",
      status: "failed",
      reason: "Could not find the LocalTunnel IP challenge value."
    });
    return;
  }

  const input = page.locator('input[type="text"], input[placeholder*="203"], input[aria-label*="IP"]');
  const continueButton = page.locator('button:has-text("Continue"), input[type="submit"]');

  if (!input.fill || !continueButton.click) {
    logs.push({
      type: "localtunnel_interstitial",
      status: "failed",
      reason: "The browser page did not expose fill/click helpers."
    });
    return;
  }

  await input.fill(tunnelIp, { timeout: 5_000 });
  await continueButton.click({ timeout: 5_000, noWaitAfter: true }).catch((error) => {
    logs.push({
      type: "localtunnel_interstitial_click",
      status: "continued_after_click_error",
      reason: error instanceof Error ? error.message : "Unknown click error"
    });
  });
  await page.waitForLoadState?.("domcontentloaded", { timeout: 15_000 }).catch(() => undefined);
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45_000 }).catch((error) => {
    logs.push({
      type: "localtunnel_interstitial_reload",
      status: "failed",
      reason: error instanceof Error ? error.message : "Unknown reload error"
    });
  });

  const textAfterBypass = await extractTextSample(page);
  logs.push({
    type: "localtunnel_interstitial",
    status: isLocalTunnelInterstitial(textAfterBypass) ? "still_visible" : "dismissed",
    tunnelHost: hostname,
    finalUrl: page.url()
  });
}

async function prepareTunnelHeaders(page: StagehandPage, targetUrl: string, logs: unknown[]) {
  const hostname = new URL(targetUrl).hostname;
  if (!hostname.endsWith(".loca.lt")) return;

  let setExtraHTTPHeaders: ((headers: Record<string, string>) => Promise<void>) | undefined;
  try {
    setExtraHTTPHeaders = page.context?.().setExtraHTTPHeaders;
  } catch (error) {
    logs.push({
      type: "localtunnel_header_bypass",
      status: "unavailable",
      tunnelHost: hostname,
      reason: error instanceof Error ? error.message : "Unknown page context error"
    });
  }

  if (!setExtraHTTPHeaders) {
    logs.push({
      type: "localtunnel_header_bypass",
      status: "unavailable",
      tunnelHost: hostname
    });
    return;
  }

  try {
    await setExtraHTTPHeaders({
      "bypass-tunnel-reminder": "true"
    });
  } catch (error) {
    logs.push({
      type: "localtunnel_header_bypass",
      status: "failed",
      tunnelHost: hostname,
      reason: error instanceof Error ? error.message : "Unknown header setup error"
    });
    return;
  }

  logs.push({
    type: "localtunnel_header_bypass",
    status: "enabled",
    tunnelHost: hostname
  });
}

function isLocalTunnelInterstitial(pageText: string) {
  return pageText.includes("You are about to visit") && pageText.includes("To continue, enter the IP shown above");
}

function getBrowserbaseSessionId(stagehand: StagehandInstance | null) {
  if (!stagehand) return null;
  return stagehand.sessionId || stagehand.browserbaseSessionId || stagehand.browserbaseSessionID || null;
}

function getModelApiKey() {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY
  );
}

function redactAuxiliary(auxiliary: StagehandLogLine["auxiliary"]) {
  if (!auxiliary) return undefined;

  return Object.fromEntries(
    Object.entries(auxiliary).map(([key, value]) => [
      key,
      {
        ...value,
        value: key.toLowerCase().includes("key") || key.toLowerCase().includes("token") ? "[redacted]" : value.value
      }
    ])
  );
}

function summarizeUnknown(value: unknown) {
  return truncateText(JSON.stringify(value, null, 2) || String(value), 1200);
}

function truncateLogs(logs: unknown[]) {
  return logs.map((log) => summarizeUnknown(log));
}

function truncateText(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}... [truncated]`;
}
