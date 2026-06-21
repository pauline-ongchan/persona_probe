import { DatabaseSetupNotice } from "@/components/DatabaseSetupNotice";
import { ProjectSettingsForm } from "@/components/ProjectSettingsForm";
import { prisma } from "@/lib/prisma/client";
import { getDatabaseSetupIssue } from "@/lib/prisma/readiness";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const databaseData = await loadProjectsData();

  if (databaseData.issue) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-8">
        <DatabaseSetupNotice issue={databaseData.issue} />
      </main>
    );
  }

  const { projects } = databaseData;

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold">Projects</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Store the target website repo connection PersonaProbe will use when it triggers autofix workflows.
        </p>
      </div>
      <ProjectSettingsForm
        projects={projects.map((project) => ({
          id: project.id,
          name: project.name,
          targetUrl: project.targetUrl,
          githubOwner: project.githubOwner,
          githubRepo: project.githubRepo,
          baseBranch: project.baseBranch,
          autofixWorkflow: project.autofixWorkflow,
          sentryOrg: project.sentryOrg,
          sentryProject: project.sentryProject
        }))}
      />
    </main>
  );
}

async function loadProjectsData() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" }
    });

    return { projects, issue: null };
  } catch (error) {
    const issue = getDatabaseSetupIssue(error);
    if (issue) return { projects: [], issue };
    throw error;
  }
}
