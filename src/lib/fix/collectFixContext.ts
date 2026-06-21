import { prisma } from "@/lib/prisma/client";
import { getSentryTraceUrl } from "@/lib/sentry/traceUrl";
import { setSafeTags, withSentrySpan } from "@/lib/sentry/withSentrySpan";
import type { FixContext } from "./types";

const INSTRUCTIONS =
  "The coding agent should make the smallest safe code change in the target website repo to fix the UI-agent failure. It should not hardcode FlowProof-specific behavior. It should add or update a regression test when practical. It should preserve accessibility.";

export async function collectFixContext({
  testCaseId,
  projectId
}: {
  testCaseId: string;
  projectId: string;
}): Promise<FixContext> {
  return withSentrySpan("fix.collect_context", { test_case_id: testCaseId }, async () => {
    const testCase = await prisma.testCase.findUnique({
      where: { id: testCaseId },
      include: {
        persona: true,
        run: true
      }
    });

    if (!testCase) {
      throw new Error("Test case not found.");
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new Error("Project not found.");
    }

    setSafeTags({
      test_case_id: testCase.id,
      github_owner: project.githubOwner,
      github_repo: project.githubRepo
    });

    const actionTrace = parseActionTrace(testCase.actionTrace);
    const screenshots = collectScreenshotUrls(testCase.screenshotUrl, actionTrace);
    const finalUrl = testCase.finalUrl || toOptionalShortString(actionTrace.at(-1)?.urlAfterAction, 1000);
    const browserbaseSessionId = testCase.browserbaseSessionId || undefined;

    const context: FixContext = {
      version: "1.0",
      testCase: {
        id: testCase.id,
        runId: testCase.runId,
        persona: `${testCase.persona.name} (${testCase.persona.key})`,
        taskGoal: testCase.run.taskGoal,
        failureReason: testCase.failureReason || testCase.agentSummary || "UI-agent test failed.",
        failureCategory: testCase.failureCategory || undefined,
        oracleType: testCase.run.oracleType,
        oracleExpected: testCase.run.oracleValue,
        oracleActual: testCase.finalTextSample ? truncate(testCase.finalTextSample, 1200) : undefined,
        finalUrl: finalUrl || undefined
      },
      target: {
        url: testCase.run.targetUrl || project.targetUrl,
        routeHint: getRouteHint(finalUrl || testCase.run.targetUrl),
        githubOwner: project.githubOwner,
        githubRepo: project.githubRepo,
        baseBranch: project.baseBranch
      },
      sentry: testCase.sentryTraceId
        ? {
            traceId: testCase.sentryTraceId,
            eventUrl: getSentryTraceUrl(testCase.sentryTraceId, project.sentryOrg),
            tags: {
              run_id: testCase.runId,
              test_case_id: testCase.id,
              persona_key: testCase.persona.key
            }
          }
        : undefined,
      browserbase: browserbaseSessionId
        ? {
            sessionId: browserbaseSessionId,
            inspectorUrl: `https://www.browserbase.com/sessions/${browserbaseSessionId}`,
            replayUrl: testCase.browserbaseSessionUrl || undefined,
            finalUrl: finalUrl || undefined
          }
        : undefined,
      actionTrace: actionTrace.map((step, index) => ({
        step: toNumber(step.stepNumber, index + 1),
        action: toShortString(step.chosenAction || step.action || "Unknown action", 600),
        observation: toOptionalShortString(step.observation || step.failureReason || step.agentSummary, 600),
        urlAfterAction: toOptionalShortString(step.urlAfterAction, 1000),
        oracleStatus: toOptionalShortString(step.oracleResult || step.oracleStatus, 80),
        personaRule: toOptionalShortString(step.personaRule, 600)
      })),
      screenshots: screenshots.length ? screenshots : undefined,
      instructions: INSTRUCTIONS
    };

    return context;
  });
}

type RawTraceStep = Record<string, unknown>;

function parseActionTrace(actionTrace: string): RawTraceStep[] {
  try {
    const parsed = JSON.parse(actionTrace);
    return Array.isArray(parsed) ? parsed.filter(isObject) : [];
  } catch {
    return [];
  }
}

function collectScreenshotUrls(testCaseScreenshotUrl: string | null, actionTrace: RawTraceStep[]) {
  const urls = [
    testCaseScreenshotUrl,
    ...actionTrace.map((step) => (typeof step.screenshotUrl === "string" ? step.screenshotUrl : null))
  ].filter((url): url is string => Boolean(url && !url.startsWith("data:")));

  return [...new Set(urls)].slice(0, 12);
}

function getRouteHint(value: string | null | undefined) {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}` || "/";
  } catch {
    return undefined;
  }
}

function isObject(value: unknown): value is RawTraceStep {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toOptionalShortString(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? truncate(value, max) : undefined;
}

function toShortString(value: unknown, max: number) {
  return typeof value === "string" && value.trim() ? truncate(value, max) : "Unknown action";
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}...[truncated]` : value;
}
