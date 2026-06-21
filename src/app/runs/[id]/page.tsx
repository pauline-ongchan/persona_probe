import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Activity, ArrowUpRight, CheckCircle2, Clock, ListChecks, MousePointer2, SearchCheck, TriangleAlert } from "lucide-react";
import { CreateFixPrButton } from "@/components/CreateFixPrButton";
import { SelfHealRunButton } from "@/components/SelfHealRunButton";
import { StartRunButton } from "@/components/StartRunButton";
import { prisma } from "@/lib/prisma/client";
import { formatDuration, formatPercent, getRunAggregates } from "@/lib/runs/aggregates";
import { getSentryTraceUrl } from "@/lib/sentry/traceUrl";

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await prisma.run.findUnique({
    where: { id },
    include: {
      project: true,
      testCases: {
        include: {
          persona: true,
          fixAttempts: {
            include: { project: true },
            orderBy: { createdAt: "desc" }
          }
        },
        orderBy: [{ priorityScore: "desc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!run) notFound();

  const aggregates = getRunAggregates(run.testCases);
  const canStart = run.status === "PENDING" || run.testCases.some((testCase) => testCase.status === "PENDING");
  const canSelfHeal =
    run.mode === "DEMO_SAFE" &&
    run.testCases.some(
      (testCase) =>
        (testCase.status === "FAIL" || testCase.status === "ERROR") && testCase.failureCategory !== "INFRA_FAILURE"
    );
  const failureDiagnoses = run.testCases
    .filter((testCase) => isFailedStatus(testCase.status))
    .map((testCase) => ({
      testCase,
      diagnosis: getFailureDiagnosis(testCase, run.oracleValue, run.mode)
    }));
  const fixAttempts = run.testCases.flatMap((testCase) =>
    testCase.fixAttempts.map((attempt) => ({
      testCase,
      attempt
    }))
  );

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link className="text-sm text-slate-500 hover:text-ink" href="/runs">
            Back to runs
          </Link>
          <h1 className="mt-2 text-3xl font-semibold">{run.name}</h1>
          <p className="mt-2 max-w-3xl text-slate-600">{run.taskGoal}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ModePill mode={run.mode} />
            <p className="min-w-0 max-w-full truncate text-sm text-slate-500">{run.targetUrl}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <StartRunButton disabled={!canStart} runId={run.id} />
          <SelfHealRunButton disabled={!canSelfHeal} runId={run.id} />
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <SummaryCard icon={<ListChecks className="h-5 w-5" />} label="Test cases" value={String(aggregates.total)} />
        <SummaryCard icon={<Activity className="h-5 w-5" />} label="Pass rate" value={formatPercent(aggregates.passRate)} />
        <SummaryCard
          icon={<TriangleAlert className="h-5 w-5" />}
          label="Persona fail rate"
          value={formatPercent(aggregates.personaFailureRate)}
        />
        <SummaryCard icon={<Clock className="h-5 w-5" />} label="Avg duration" value={formatDuration(aggregates.averageDurationMs)} />
      </section>
      {aggregates.infraFailures ? (
        <p className="mt-3 text-sm text-slate-500">
          {aggregates.infraFailures} infrastructure failure{aggregates.infraFailures === 1 ? "" : "s"} excluded from persona
          failure rate.
        </p>
      ) : null}

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 rounded border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold">Persona results</h2>
            <p className="mt-1 text-sm text-slate-500">Each result shows where the flow stopped and why that persona struggled.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {run.testCases.map((testCase) => {
              const latestFixAttempt = testCase.fixAttempts[0] || null;
              const canCreateFix = isFailedStatus(testCase.status) && Boolean(testCase.failureReason);
              const diagnosis = getFailureDiagnosis(testCase, run.oracleValue, run.mode);

              return (
                <article key={testCase.id} className="px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{testCase.persona.name}</h3>
                        <StatusPill status={testCase.status} />
                        <CategoryPill category={testCase.failureCategory} />
                      </div>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{testCase.persona.description}</p>
                    </div>
                    <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {formatDuration(testCase.durationMs)}
                    </span>
                  </div>

                  {isFailedStatus(testCase.status) ? (
                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                      <InsightBlock label="Where" value={diagnosis.where} />
                      <InsightBlock label="Why" value={diagnosis.why} />
                      <InsightBlock label="Evidence" value={diagnosis.evidence} />
                    </div>
                  ) : (
                    <div
                      className={`mt-4 flex items-start gap-2 rounded border p-3 text-sm ${
                        testCase.status === "PASS"
                          ? "border-moss/20 bg-moss/10 text-moss"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {testCase.status === "PASS" ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                      )}
                      <p>{getNonFailureSummary(testCase.status)}</p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <ResultLink href={testCase.browserbaseSessionUrl} label="Browserbase" />
                    <ResultLink
                      href={testCase.sentryTraceId ? getSentryTraceUrl(testCase.sentryTraceId, run.project?.sentryOrg) : null}
                      label="Sentry trace"
                    />
                    <CreateFixPrButton
                      disabled={!canCreateFix}
                      initialFixAttempt={
                        latestFixAttempt
                          ? {
                              id: latestFixAttempt.id,
                              status: latestFixAttempt.status,
                              prUrl: latestFixAttempt.prUrl,
                              errorMessage: latestFixAttempt.errorMessage
                            }
                          : null
                      }
                      projectId={run.projectId}
                      testCaseId={testCase.id}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="min-w-0 self-start rounded border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <SearchCheck className="h-5 w-5 text-slate-500" />
            <h2 className="font-semibold">Failure diagnosis</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {failureDiagnoses.map(({ testCase, diagnosis }) => (
              <article key={testCase.id} className="px-4 py-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{testCase.persona.name}</p>
                  <StatusPill status={testCase.status} />
                </div>
                <p className="mt-3 leading-6 text-slate-600">
                  <span className="font-medium text-slate-800">Where:</span> {diagnosis.where}
                </p>
                <p className="mt-2 leading-6 text-slate-600">
                  <span className="font-medium text-slate-800">Why:</span> {diagnosis.why}
                </p>
              </article>
            ))}
            {!failureDiagnoses.length ? (
              <p className="px-4 py-5 text-sm leading-6 text-slate-500">
                No diagnosed failures yet. Start the run to generate persona evidence.
              </p>
            ) : null}
          </div>
        </aside>
      </section>

      <section className="mt-6 rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Fix Attempts</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {fixAttempts.map(({ testCase, attempt }) => (
            <article key={attempt.id} className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[0.7fr_1fr_0.9fr_auto] lg:items-start">
              <div>
                <StatusPill status={attempt.status} />
                <p className="mt-2 text-xs text-slate-500">{attempt.createdAt.toLocaleString()}</p>
              </div>
              <div>
                <p className="font-medium">{testCase.persona.name}</p>
                <p className="mt-1 leading-6 text-slate-600">
                  {testCase.failureReason || attempt.errorMessage || "No failure reason captured."}
                </p>
              </div>
              <p className="break-words text-slate-600">
                {attempt.project.githubOwner}/{attempt.project.githubRepo}
              </p>
              {attempt.prUrl ? (
                <a className="inline-flex items-center gap-1 font-medium text-ink" href={attempt.prUrl} target="_blank" rel="noreferrer">
                  View PR
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              ) : (
                <span className="text-slate-400">n/a</span>
              )}
            </article>
          ))}
          {!fixAttempts.length ? (
            <p className="px-4 py-5 text-sm text-slate-500">
              No fix attempts yet.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-6 rounded border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <MousePointer2 className="h-5 w-5 text-slate-500" />
          <h2 className="font-semibold">Action traces</h2>
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          {run.testCases.map((testCase) => (
            <article key={testCase.id} className="rounded border border-slate-200">
              <div className="border-b border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{testCase.persona.name}</h3>
                  <StatusPill status={testCase.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <CategoryPill category={testCase.failureCategory} />
                  {testCase.browserbaseSessionUrl ? (
                    <a className="text-xs font-medium text-ink" href={testCase.browserbaseSessionUrl} target="_blank" rel="noreferrer">
                      Browserbase session
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="max-h-[620px] space-y-3 overflow-auto p-4">
                {parseActionTrace(testCase.actionTrace).map((step) => (
                  <div key={`${testCase.id}-${step.stepNumber}`} className="rounded border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Step {step.stepNumber}: {step.chosenAction}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">{step.personaRule}</p>
                      </div>
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          step.oracleResult === "PASS" ? "bg-moss/15 text-moss" : "bg-coral/15 text-coral"
                        }`}
                      >
                        {step.oracleResult}
                      </span>
                    </div>
                    {step.failureReason ? <p className="mt-2 text-xs text-coral">{step.failureReason}</p> : null}
                    <p className="mt-2 truncate text-xs text-slate-500">{step.urlAfterAction}</p>
                    {step.screenshotUrl ? (
                      <Image
                        alt={`Screenshot for ${testCase.persona.name} step ${step.stepNumber}`}
                        className="mt-3 max-h-48 w-full rounded border border-slate-200 object-cover object-top"
                        height={192}
                        src={step.screenshotUrl}
                        unoptimized
                        width={420}
                      />
                    ) : null}
                  </div>
                ))}
                {!parseActionTrace(testCase.actionTrace).length ? (
                  <p className="text-sm text-slate-500">No trace recorded yet.</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Raw logs</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {run.testCases.map((testCase) => (
            <details key={testCase.id} className="px-4 py-3">
              <summary className="cursor-pointer font-medium">{testCase.persona.name}</summary>
              <pre className="mt-3 max-h-72 overflow-auto rounded bg-slate-950 p-4 text-xs text-slate-100">
                {formatRawLogs(testCase.rawLogs)}
              </pre>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-sm">{label}</span>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function InsightBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function ResultLink({ href, label }: { href: string | null; label: string }) {
  if (!href) {
    return <span className="text-sm text-slate-400">{label}: n/a</span>;
  }

  return (
    <a className="inline-flex items-center gap-1 text-sm font-medium text-ink" href={href} rel="noreferrer" target="_blank">
      {label}
      <ArrowUpRight className="h-4 w-4" />
    </a>
  );
}

function StatusPill({ status }: { status: string }) {
  const classes =
    status === "PASS"
      ? "bg-moss/15 text-moss"
      : status === "FAIL" || status === "ERROR"
        ? "bg-coral/15 text-coral"
        : status === "RUNNING"
          ? "bg-amber/15 text-amber"
          : "bg-slate-100 text-slate-600";

  return <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${classes}`}>{status}</span>;
}

function ModePill({ mode }: { mode: string }) {
  const label = mode === "DEMO_SAFE" ? "Sample flow" : "Target website";
  const classes = mode === "DEMO_SAFE" ? "bg-moss/15 text-moss" : "bg-ink text-white";
  return <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${classes}`}>{label}</span>;
}

function CategoryPill({ category }: { category: string | null }) {
  if (!category) {
    return <span className="inline-flex rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">n/a</span>;
  }

  const classes =
    category === "INFRA_FAILURE"
      ? "bg-slate-100 text-slate-600"
      : category === "UI_AMBIGUITY"
        ? "bg-amber/15 text-amber"
        : category === "PERSONA_FAILURE"
          ? "bg-coral/15 text-coral"
          : "bg-ink/10 text-ink";

  return <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${classes}`}>{category.replaceAll("_", " ")}</span>;
}

type FailureDiagnosisInput = {
  status: string;
  failureReason: string | null;
  failureCategory: string | null;
  finalUrl: string | null;
  finalTextSample: string | null;
  actionTrace: string;
  agentSummary: string | null;
  persona: {
    key: string;
    name: string;
    description: string;
  };
};

function isFailedStatus(status: string) {
  return status === "FAIL" || status === "ERROR";
}

function getNonFailureSummary(status: string) {
  if (status === "PASS") return "Flow completed and the configured success criteria were observed.";
  if (status === "RUNNING") return "Execution is in progress. Results will update when the persona finishes.";
  return "Waiting for execution to start.";
}

function getFailureDiagnosis(testCase: FailureDiagnosisInput, expected: string, runMode: string) {
  const trace = parseActionTrace(testCase.actionTrace);
  const failedStep = [...trace].reverse().find((step) => step.oracleResult === "FAIL") || trace.at(-1) || null;
  const reason = getSpecificFailureReason(testCase, failedStep);

  return {
    where: describeFailureLocation(testCase, failedStep, reason, runMode),
    why: explainFailure(testCase, failedStep, reason, expected, runMode),
    evidence: getFailureEvidence(testCase, failedStep, expected)
  };
}

function describeFailureLocation(
  testCase: FailureDiagnosisInput,
  failedStep: TraceStep | null,
  reason: string,
  runMode: string
) {
  const normalized = reason.toLowerCase();
  if (isMissingDemoModalControl(normalized)) {
    return "Sample flow target: the page did not expose the expected privacy modal control.";
  }
  if (normalized.includes("mobile") || normalized.includes("below the fold") || normalized.includes("touch target")) {
    return "Mobile viewport: the primary save or submit action was not visible enough to complete.";
  }
  if (normalized.includes("billing email") || normalized.includes("account email")) {
    return "Email form: competing account and billing fields made the correct target ambiguous.";
  }
  if (normalized.includes("invalid") || normalized.includes("validation") || normalized.includes("back navigation")) {
    return "Validation recovery: the flow did not guide the persona back to a successful submission.";
  }
  if (normalized.includes("privacy") || normalized.includes("permission") || normalized.includes("newsletter")) {
    return "Privacy prompt or optional data step: extra choices interrupted the path to completion.";
  }
  if (normalized.includes("selector") && normalized.includes("not found")) {
    return "Success state: the expected confirmation element was missing from the final page.";
  }

  const personaLocation = getPersonaFailureLocation(testCase, failedStep, reason, runMode);
  if (personaLocation && (isGenericFailureReason(reason) || !failedStep?.chosenAction)) return personaLocation;

  const location = getUrlLabel(failedStep?.urlAfterAction || testCase.finalUrl);
  if (failedStep?.chosenAction) {
    return `${formatAction(failedStep.chosenAction)}${location ? ` on ${location}` : ""}`;
  }
  if (location) return `Final page state on ${location}`;
  return testCase.status === "ERROR" ? "Execution setup or browser session" : "Final page state";
}

function explainFailure(
  testCase: FailureDiagnosisInput,
  failedStep: TraceStep | null,
  reason: string,
  expected: string,
  runMode: string
) {
  if (isMissingDemoModalControl(reason.toLowerCase())) {
    return "FlowProof expected the built-in sample page with a privacy modal, but this run was created against a page that does not contain that modal. Create a new sample run after the latest deployment.";
  }
  const isGenericReason = isGenericFailureReason(reason, expected);
  if (reason && !isGenericReason) return reason;

  if (testCase.failureCategory === "INFRA_FAILURE") {
    return "The browser run failed before FlowProof could judge the user flow.";
  }
  const personaExplanation = getPersonaFailureExplanation(testCase, failedStep, expected, runMode);
  if (personaExplanation) return personaExplanation;
  if (reason.toLowerCase().includes("selector")) {
    return `The run ended without finding the required selector "${expected}".`;
  }
  if (reason.toLowerCase().includes("url")) {
    return `The run ended on a different URL than the configured success criteria expected.`;
  }
  if (failedStep?.personaRule) {
    return `The persona behavior at this step did not produce the required success confirmation "${expected}".`;
  }
  return `The flow ended without showing the required success confirmation "${expected}".`;
}

function getFailureEvidence(testCase: FailureDiagnosisInput, failedStep: TraceStep | null, expected: string) {
  if (failedStep?.chosenAction) {
    return `Step ${failedStep.stepNumber}: ${formatAction(failedStep.chosenAction)}`;
  }
  const finalLocation = getUrlLabel(testCase.finalUrl);
  if (finalLocation) return `Final location: ${finalLocation}; expected "${expected}".`;
  return testCase.failureReason || testCase.agentSummary || "No detailed trace was captured for this failure.";
}

function getSpecificFailureReason(testCase: FailureDiagnosisInput, failedStep: TraceStep | null) {
  const candidates = [failedStep?.failureReason, testCase.failureReason, testCase.agentSummary].filter(
    (value): value is string => Boolean(value && value.trim())
  );
  return candidates.find((value) => !isGenericFailureReason(value)) || candidates[0] || "No failure reason captured.";
}

function getPersonaFailureLocation(
  testCase: FailureDiagnosisInput,
  failedStep: TraceStep | null,
  reason: string,
  runMode: string
) {
  if (!shouldUseSamplePersonaCopy(testCase, runMode)) return null;

  const persona = normalizePersonaKey(testCase.persona.key);
  const location = getUrlLabel(failedStep?.urlAfterAction || testCase.finalUrl);
  const suffix = location ? ` on ${location}` : "";

  if (persona === "mobile-first") {
    return `Mobile viewport${suffix}: the visible field was reachable, but the save/update action was not an obvious touch target.`;
  }
  if (persona === "impatient") {
    return `First-plausible path${suffix}: the persona saved after choosing the first reasonable-looking email field.`;
  }
  if (persona === "esl") {
    return `Email fields${suffix}: Account email and Billing email were easy to confuse.`;
  }
  if (persona === "adversarial") {
    return `Validation recovery${suffix}: invalid input and back navigation left the flow off the success path.`;
  }
  if (persona === "privacy-sensitive") {
    return `Privacy-sensitive path${suffix}: optional consent or personal-data choices interrupted the account update.`;
  }
  if (persona === "power-user") {
    return `Direct-navigation path${suffix}: the fastest route did not make the required confirmation clear.`;
  }

  if (testCase.failureCategory === "UI_AMBIGUITY" && reason) {
    return `Ambiguous next action${suffix || "."}`;
  }

  return null;
}

function getPersonaFailureExplanation(
  testCase: FailureDiagnosisInput,
  failedStep: TraceStep | null,
  expected: string,
  runMode: string
) {
  if (!shouldUseSamplePersonaCopy(testCase, runMode)) return null;

  const persona = normalizePersonaKey(testCase.persona.key);
  const failedAction = failedStep?.chosenAction ? ` Last recorded action: ${formatAction(failedStep.chosenAction)}.` : "";

  if (persona === "mobile-first") {
    return `On the 390x844 mobile viewport, this persona uses only obvious visible touch targets. The account email field was reachable, but the save/update action was not visible enough to complete the confirmation "${expected}".${failedAction}`;
  }
  if (persona === "impatient") {
    return `This persona clicks the first plausible control and does not retry. Billing email and the vague save action looked good enough, so they stopped before finding the exact path to "${expected}".${failedAction}`;
  }
  if (persona === "esl") {
    return `This persona needs literal labels. The Account email versus Billing email distinction was too subtle, so they chose the wrong email field and never reached "${expected}".${failedAction}`;
  }
  if (persona === "adversarial") {
    return `This persona intentionally tries invalid input, changes direction, and uses back navigation. The flow did not recover clearly from that edge-case path, so it never reached "${expected}".${failedAction}`;
  }
  if (persona === "privacy-sensitive") {
    return `This persona refuses optional tracking, newsletters, permissions, and unnecessary data. Those choices added friction around the account update before the page reached "${expected}".${failedAction}`;
  }
  if (persona === "power-user") {
    return `This persona uses shortcuts and direct targeting. The flow did not expose a clean enough fast path to the exact account-email update and "${expected}" confirmation.${failedAction}`;
  }

  if (testCase.failureCategory === "UI_AMBIGUITY") {
    return `The next correct action was not obvious enough for ${testCase.persona.name}.`;
  }
  if (testCase.failureCategory === "PERSONA_FAILURE") {
    return `${testCase.persona.name}'s behavior policy led to a plausible user choice that missed "${expected}".`;
  }

  return null;
}

function shouldUseSamplePersonaCopy(testCase: FailureDiagnosisInput, runMode: string) {
  return runMode === "DEMO_SAFE" && ["PERSONA_FAILURE", "UI_AMBIGUITY"].includes(testCase.failureCategory || "");
}

function normalizePersonaKey(personaKey: string) {
  const key = personaKey.toLowerCase();
  if (key.includes("mobile-first")) return "mobile-first";
  if (key.includes("impatient") || key.includes("rushed-low-patience")) return "impatient";
  if (key.includes("esl") || key.includes("plain-language")) return "esl";
  if (key.includes("adversarial")) return "adversarial";
  if (key.includes("privacy-sensitive")) return "privacy-sensitive";
  if (key.includes("power-user")) return "power-user";
  return key;
}

function isGenericFailureReason(value: string, expected?: string) {
  return isGenericOracleFailure(value, expected) || isGenericCategorySummary(value);
}

function isGenericOracleFailure(value: string, expected?: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("page text did not contain") ||
    normalized.includes("final url did not contain") ||
    normalized === `the flow ended without showing the required success confirmation "${expected || ""}".`.toLowerCase()
  );
}

function isGenericCategorySummary(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized === "the persona policy led to choices that did not satisfy the oracle." ||
    normalized === "the browser agent failed to complete the task despite an executable persona policy." ||
    normalized === "the ui made the next correct action ambiguous for this persona." ||
    normalized === "the run failed for an unknown reason."
  );
}

function isMissingDemoModalControl(normalizedReason: string) {
  return (
    normalizedReason.includes("timeout") &&
    (normalizedReason.includes("modal-allow") || normalizedReason.includes("modal-reject"))
  );
}

function getUrlLabel(value: string | null | undefined) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return truncateText(`${url.pathname}${url.search}` || "/", 90);
  } catch {
    return truncateText(value, 90);
  }
}

function formatAction(value: string) {
  return truncateText(value.replace(/\s+/g, " ").trim(), 120);
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

type TraceStep = {
  stepNumber: number;
  chosenAction: string;
  urlAfterAction: string;
  personaRule: string;
  oracleResult: "PASS" | "FAIL";
  failureReason: string | null;
  screenshotUrl: string | null;
};

function parseActionTrace(actionTrace: string): TraceStep[] {
  try {
    const parsed = JSON.parse(actionTrace);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatRawLogs(rawLogs: string) {
  try {
    return JSON.stringify(JSON.parse(rawLogs), null, 2);
  } catch {
    return rawLogs || "[]";
  }
}
