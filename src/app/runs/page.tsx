import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { getRunAggregates, formatPercent } from "@/lib/runs/aggregates";

export default async function RunsPage() {
  const runs = await prisma.run.findMany({
    include: {
      testCases: {
        include: { persona: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Recent</p>
          <h1 className="mt-2 text-3xl font-semibold">Runs</h1>
        </div>
        <Link className="rounded bg-ink px-4 py-2 text-sm font-medium text-white" href="/">
          New run
        </Link>
      </div>

      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Run</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Persona fail rate</th>
              <th className="px-4 py-3">Failures</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {runs.map((run) => {
              const aggregates = getRunAggregates(run.testCases);
              return (
                <tr key={run.id}>
                  <td className="px-4 py-3">
                    <span className="block font-medium">{run.name}</span>
                    <span className="block text-xs text-slate-500">{run.createdAt.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded px-2 py-1 text-xs font-medium ${
                        run.mode === "DEMO_SAFE" ? "bg-moss/15 text-moss" : "bg-ink text-white"
                      }`}
                    >
                      {run.mode === "DEMO_SAFE" ? "Demo-Safe" : "Real Website"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{run.status}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-600">{run.targetUrl}</td>
                  <td className="px-4 py-3">{formatPercent(aggregates.personaFailureRate)}</td>
                  <td className="px-4 py-3">{aggregates.failed + aggregates.errored}</td>
                  <td className="px-4 py-3 text-right">
                    <Link className="inline-flex items-center gap-1 font-medium text-ink" href={`/runs/${run.id}`}>
                      Open
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!runs.length ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                  No runs yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
