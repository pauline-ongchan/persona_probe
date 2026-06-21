import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Activity, ArrowUpRight, Clock, ListChecks, MousePointer2, TriangleAlert } from "lucide-react";
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
            <p className="max-w-3xl truncate text-sm text-slate-500">{run.targetUrl}</p>
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

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
        <div className="rounded border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold">Persona matrix</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1060px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Persona</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Failure reason</th>
                  <th className="px-4 py-3">Browserbase</th>
                  <th className="px-4 py-3">Sentry</th>
                  <th className="px-4 py-3">Autofix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {run.testCases.map((testCase) => {
                  const latestFixAttempt = testCase.fixAttempts[0] || null;
                  const canCreateFix =
                    (testCase.status === "FAIL" || testCase.status === "ERROR") && Boolean(testCase.failureReason);

                  return (
                    <tr key={testCase.id}>
                      <td className="px-4 py-3">
                        <span className="block font-medium">{testCase.persona.name}</span>
                        <span className="block text-xs text-slate-500">{testCase.persona.description}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={testCase.status} />
                      </td>
                      <td className="px-4 py-3">{testCase.priorityScore.toFixed(3)}</td>
                      <td className="px-4 py-3">{formatDuration(testCase.durationMs)}</td>
                      <td className="px-4 py-3">
                        <CategoryPill category={testCase.failureCategory} />
                      </td>
                      <td className="max-w-xs px-4 py-3 text-slate-600">
                        {testCase.failureReason || testCase.agentSummary || "Waiting to run"}
                      </td>
                      <td className="px-4 py-3">
                        {testCase.browserbaseSessionUrl ? (
                          <a
                            className="inline-flex items-center gap-1 font-medium text-ink"
                            href={testCase.browserbaseSessionUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Open
                            <ArrowUpRight className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-slate-400">n/a</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {testCase.sentryTraceId ? (
                          <a
                            className="inline-flex items-center gap-1 font-medium text-ink"
                            href={getSentryTraceUrl(testCase.sentryTraceId, run.project?.sentryOrg)}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Trace
                            <ArrowUpRight className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-slate-400">n/a</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-6">
          <section className="rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="font-semibold">Ranked risk</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {aggregates.personaRisks.map((risk) => (
                <div key={risk.key} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{risk.name}</span>
                    <span className="text-sm text-coral">{formatPercent(risk.failureRate)}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded bg-slate-100">
                    <div className="h-full bg-coral" style={{ width: `${Math.min(risk.riskScore * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="font-semibold">Top failures</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {aggregates.topFailures.map((testCase) => (
                <div key={testCase.persona.key + testCase.finalUrl} className="px-4 py-3 text-sm">
                  <p className="font-medium">{testCase.persona.name}</p>
                  <p className="mt-1 text-slate-600">{testCase.failureReason || "No failure reason captured."}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{testCase.finalUrl || "No final URL"}</p>
                </div>
              ))}
              {!aggregates.topFailures.length ? (
                <p className="px-4 py-5 text-sm text-slate-500">No failures yet.</p>
              ) : null}
            </div>
          </section>
        </aside>
      </section>

      <section className="mt-6 rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Fix Attempts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Persona</th>
                <th className="px-4 py-3">Failure reason</th>
                <th className="px-4 py-3">GitHub repo</th>
                <th className="px-4 py-3">PR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {run.testCases.flatMap((testCase) =>
                testCase.fixAttempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="px-4 py-3">
                      <StatusPill status={attempt.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{attempt.createdAt.toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium">{testCase.persona.name}</td>
                    <td className="max-w-sm px-4 py-3 text-slate-600">
                      {testCase.failureReason || attempt.errorMessage || "No failure reason captured."}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {attempt.project.githubOwner}/{attempt.project.githubRepo}
                    </td>
                    <td className="px-4 py-3">
                      {attempt.prUrl ? (
                        <a className="inline-flex items-center gap-1 font-medium text-ink" href={attempt.prUrl} target="_blank" rel="noreferrer">
                          View PR
                          <ArrowUpRight className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-slate-400">n/a</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
              {!run.testCases.some((testCase) => testCase.fixAttempts.length) ? (
                <tr>
                  <td className="px-4 py-5 text-sm text-slate-500" colSpan={6}>
                    No fix attempts yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
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
  const label = mode === "DEMO_SAFE" ? "Demo-Safe Mode" : "Real Website Mode";
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
