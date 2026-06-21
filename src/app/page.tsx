import { DatabaseSetupNotice } from "@/components/DatabaseSetupNotice";
import { RunForm } from "@/components/RunForm";
import { prisma } from "@/lib/prisma/client";
import { getDatabaseSetupIssue } from "@/lib/prisma/readiness";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const databaseData = await loadHomeData();

  if (databaseData.issue) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-8">
        <DatabaseSetupNotice issue={databaseData.issue} />
      </main>
    );
  }

  const { personas, projects } = databaseData;

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.4fr]">
        <div className="pt-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-moss">Pre-production UI QA</p>
          <h1 className="mt-3 max-w-2xl text-5xl font-semibold leading-tight">
            Find fragile user flows before real users do.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            FlowProof lets developers define a target page, task, and success criteria, then runs the flow across
            behavioral personas to catch confusing, inaccessible, or brittle moments before shipping.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            <div className="rounded border border-slate-200 bg-white p-4">
              <span className="block text-2xl font-semibold">{personas.length}</span>
              <span className="text-xs text-slate-500">personas</span>
            </div>
            <div className="rounded border border-slate-200 bg-white p-4">
              <span className="block text-2xl font-semibold">4</span>
              <span className="text-xs text-slate-500">criteria types</span>
            </div>
            <div className="rounded border border-slate-200 bg-white p-4">
              <span className="block text-2xl font-semibold">1</span>
              <span className="text-xs text-slate-500">sample flow</span>
            </div>
          </div>
        </div>
        <div className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <RunForm
            personas={personas}
            projects={projects.map((project) => ({
              id: project.id,
              name: project.name,
              targetUrl: project.targetUrl,
              githubOwner: project.githubOwner,
              githubRepo: project.githubRepo
            }))}
          />
        </div>
      </section>
    </main>
  );
}

async function loadHomeData() {
  try {
    const [personas, projects] = await Promise.all([
      prisma.persona.findMany({
        orderBy: [{ riskWeight: "desc" }, { name: "asc" }]
      }),
      prisma.project.findMany({
        orderBy: { createdAt: "desc" }
      })
    ]);

    return { personas, projects, issue: null };
  } catch (error) {
    const issue = getDatabaseSetupIssue(error);
    if (issue) return { personas: [], projects: [], issue };
    throw error;
  }
}
