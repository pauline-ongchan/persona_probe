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
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-moss">Hackathon MVP</p>
          <h1 className="mt-3 max-w-2xl text-5xl font-semibold leading-tight">
            Stress-test AI browser agents across behavioral personas.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            PersonaProbe runs Browserbase Stagehand sessions with persona-conditioned instructions, judges the outcome,
            and ranks the riskiest task-persona combinations.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            <div className="rounded border border-slate-200 bg-white p-4">
              <span className="block text-2xl font-semibold">{personas.length}</span>
              <span className="text-xs text-slate-500">personas</span>
            </div>
            <div className="rounded border border-slate-200 bg-white p-4">
              <span className="block text-2xl font-semibold">4</span>
              <span className="text-xs text-slate-500">oracles</span>
            </div>
            <div className="rounded border border-slate-200 bg-white p-4">
              <span className="block text-2xl font-semibold">1</span>
              <span className="text-xs text-slate-500">demo flow</span>
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
