import { ProjectSettingsForm } from "@/components/ProjectSettingsForm";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" }
  });

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
