"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Github, Save } from "lucide-react";

type Project = {
  id: string;
  name: string;
  targetUrl: string;
  githubOwner: string;
  githubRepo: string;
  baseBranch: string;
  autofixWorkflow: string;
  sentryOrg: string | null;
  sentryProject: string | null;
};

export function ProjectSettingsForm({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    targetUrl: "",
    githubOwner: "",
    githubRepo: "",
    baseBranch: "main",
    autofixWorkflow: "flowproof-autofix.yml",
    sentryOrg: "",
    sentryProject: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save project.");
      setIsSaving(false);
      return;
    }

    setForm({
      name: "",
      targetUrl: "",
      githubOwner: "",
      githubRepo: "",
      baseBranch: "main",
      autofixWorkflow: "flowproof-autofix.yml",
      sentryOrg: "",
      sentryProject: ""
    });
    setIsSaving(false);
    router.refresh();
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <form onSubmit={saveProject} className="rounded border border-slate-200 bg-white p-5">
        <div className="mb-5 flex items-center gap-2">
          <Github className="h-5 w-5 text-slate-500" />
          <h2 className="font-semibold">Target repo connection</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Project name" value={form.name} onChange={(value) => updateField("name", value)} />
          <TextField label="Target URL" value={form.targetUrl} onChange={(value) => updateField("targetUrl", value)} />
          <TextField label="GitHub owner" value={form.githubOwner} onChange={(value) => updateField("githubOwner", value)} />
          <TextField label="GitHub repo" value={form.githubRepo} onChange={(value) => updateField("githubRepo", value)} />
          <TextField label="Base branch" value={form.baseBranch} onChange={(value) => updateField("baseBranch", value)} />
          <TextField
            label="Workflow file name"
            value={form.autofixWorkflow}
            onChange={(value) => updateField("autofixWorkflow", value)}
          />
          <TextField label="Sentry org" value={form.sentryOrg} onChange={(value) => updateField("sentryOrg", value)} />
          <TextField label="Sentry project" value={form.sentryProject} onChange={(value) => updateField("sentryProject", value)} />
        </div>

        {error ? <p className="mt-4 rounded border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p> : null}

        <button
          className="focus-ring mt-5 inline-flex items-center gap-2 rounded bg-ink px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSaving}
          type="submit"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save project"}
        </button>
      </form>

      <section className="rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Configured projects</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {projects.map((project) => (
            <article key={project.id} className="px-4 py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="mt-1 truncate text-slate-500">{project.targetUrl}</p>
                </div>
                <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  {project.baseBranch}
                </span>
              </div>
              <p className="mt-2 text-slate-600">
                {project.githubOwner}/{project.githubRepo}
              </p>
              <p className="mt-1 text-xs text-slate-500">{project.autofixWorkflow}</p>
            </article>
          ))}
          {!projects.length ? <p className="px-4 py-5 text-sm text-slate-500">No projects configured yet.</p> : null}
        </div>
      </section>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="focus-ring mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
