import Link from "next/link";
import { Database } from "lucide-react";
import type { DatabaseSetupIssue } from "@/lib/prisma/readiness";

export function DatabaseSetupNotice({ issue }: { issue: DatabaseSetupIssue }) {
  return (
    <section className="rounded border border-amber/30 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <Database className="mt-0.5 h-5 w-5 text-amber" />
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-amber">Setup needed</p>
          <h2 className="mt-2 text-2xl font-semibold">{issue.title}</h2>
          <p className="mt-2 max-w-2xl leading-7 text-slate-600">{issue.message}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded border border-slate-200 bg-slate-50 p-4">
          <p className="font-medium">1. Add a database</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Use a hosted Postgres database for Vercel, such as Neon or Supabase.
          </p>
        </div>
        <div className="rounded border border-slate-200 bg-slate-50 p-4">
          <p className="font-medium">2. Set env vars</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Add DATABASE_URL, GITHUB_TOKEN, PERSONAPROBE_APP_URL, and FIX_CONTEXT_SECRET in Vercel.
          </p>
        </div>
        <div className="rounded border border-slate-200 bg-slate-50 p-4">
          <p className="font-medium">3. Prepare Prisma</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Apply the schema to the database and seed personas before running probes.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link className="rounded bg-ink px-4 py-2 text-sm font-medium text-white" href="/projects">
          Project settings
        </Link>
        <Link className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-ink" href="/runs">
          Runs
        </Link>
      </div>
    </section>
  );
}
