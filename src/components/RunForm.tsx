"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FlaskConical, Globe2, Play, Shield } from "lucide-react";

type Persona = {
  key: string;
  name: string;
  description: string;
  riskWeight: number;
};

type Project = {
  id: string;
  name: string;
  targetUrl: string;
  githubOwner: string;
  githubRepo: string;
};

export function RunForm({ personas, projects }: { personas: Persona[]; projects: Project[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(() => personas.map((persona) => persona.key));
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [mode, setMode] = useState<"DEMO_SAFE" | "REAL_WEBSITE">("DEMO_SAFE");
  const [targetUrl, setTargetUrl] = useState("");
  const [taskGoal, setTaskGoal] = useState("Change the account email to test@example.com and reach the confirmation screen.");
  const [oracleType, setOracleType] = useState("TEXT_CONTAINS");
  const [oracleValue, setOracleValue] = useState("Email updated successfully");
  const [maxRuns, setMaxRuns] = useState(Math.min(personas.length, 8));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fallbackUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    if (process.env.NEXT_PUBLIC_DEMO_BASE_URL) {
      return `${process.env.NEXT_PUBLIC_DEMO_BASE_URL.replace(/\/$/, "")}/demo-app/account-settings`;
    }
    return "https://userpersonatestwebsite.vercel.app/demo-app/account-settings";
  }, []);

  const isDemoMode = mode === "DEMO_SAFE";
  const selectedProject = projects.find((project) => project.id === projectId) || null;

  async function submitRun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        projectId: projectId || undefined,
        targetUrl: targetUrl || (!isDemoMode ? selectedProject?.targetUrl : fallbackUrl),
        taskGoal: isDemoMode
          ? "Change the account email to test@example.com and reach the confirmation screen."
          : taskGoal,
        oracleType: isDemoMode ? "TEXT_CONTAINS" : oracleType,
        oracleValue: isDemoMode ? "Email updated successfully" : oracleValue,
        personaKeys: selected,
        maxRuns
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not create run.");
      setIsSubmitting(false);
      return;
    }

    router.push(`/runs/${payload.run.id}`);
  }

  function togglePersona(key: string) {
    setSelected((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  }

  return (
    <form onSubmit={submitRun} className="space-y-6">
      <section>
        <span className="text-sm font-medium text-slate-700">Mode</span>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <button
            className={`focus-ring flex items-start gap-3 rounded border p-4 text-left ${
              isDemoMode ? "border-ink bg-white shadow-sm" : "border-slate-200 bg-slate-50"
            }`}
            onClick={() => setMode("DEMO_SAFE")}
            type="button"
          >
            <FlaskConical className="mt-0.5 h-5 w-5 text-moss" />
            <span>
              <span className="block font-medium">Demo-Safe Mode</span>
              <span className="mt-1 block text-sm leading-5 text-slate-600">
                Runs the built-in account settings trap flow with a fixed oracle.
              </span>
            </span>
          </button>
          <button
            className={`focus-ring flex items-start gap-3 rounded border p-4 text-left ${
              !isDemoMode ? "border-ink bg-white shadow-sm" : "border-slate-200 bg-slate-50"
            }`}
            onClick={() => setMode("REAL_WEBSITE")}
            type="button"
          >
            <Globe2 className="mt-0.5 h-5 w-5 text-ink" />
            <span>
              <span className="block font-medium">Real Website Mode</span>
              <span className="mt-1 block text-sm leading-5 text-slate-600">
                Uses Browserbase on a public URL with configurable task and oracle.
              </span>
            </span>
          </button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Project</span>
          <select
            className="focus-ring mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} - {project.githubOwner}/{project.githubRepo}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Target URL</span>
          <input
            className="focus-ring mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2"
            placeholder={isDemoMode ? fallbackUrl : selectedProject?.targetUrl || "https://example.com/settings"}
            value={targetUrl}
            onChange={(event) => setTargetUrl(event.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.6fr_1fr]">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Max runs</span>
          <input
            className="focus-ring mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2"
            min={1}
            max={12}
            type="number"
            value={maxRuns}
            onChange={(event) => setMaxRuns(Number(event.target.value))}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Task goal</span>
        <textarea
          className="focus-ring mt-2 min-h-24 w-full rounded border border-slate-300 bg-white px-3 py-2"
          disabled={isDemoMode}
          value={isDemoMode ? "Change the account email to test@example.com and reach the confirmation screen." : taskGoal}
          onChange={(event) => setTaskGoal(event.target.value)}
        />
      </label>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Success criteria type</span>
          <select
            className="focus-ring mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2"
            disabled={isDemoMode}
            value={oracleType}
            onChange={(event) => setOracleType(event.target.value)}
          >
            <option value="TEXT_CONTAINS">Page text contains</option>
            <option value="URL_CONTAINS">URL contains</option>
            <option value="SELECTOR_EXISTS">Selector exists</option>
            <option value="LLM_JUDGE">LLM judge stub</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Success criteria value</span>
          <input
            className="focus-ring mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2"
            disabled={isDemoMode}
            value={isDemoMode ? "Email updated successfully" : oracleValue}
            onChange={(event) => setOracleValue(event.target.value)}
          />
        </label>
      </div>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Personas</h2>
          <span className="text-sm text-slate-500">{selected.length} selected</span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {personas.map((persona) => {
            const checked = selected.includes(persona.key);
            return (
              <label
                key={persona.key}
                className={`block rounded border bg-white p-4 ${
                  checked ? "border-ink shadow-sm" : "border-slate-200"
                }`}
              >
                <span className="flex items-start gap-3">
                  <input
                    className="mt-1 h-4 w-4"
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePersona(persona.key)}
                  />
                  <span>
                    <span className="block font-medium">{persona.name}</span>
                    <span className="mt-1 block text-sm leading-5 text-slate-600">{persona.description}</span>
                    <span className="mt-2 inline-flex items-center rounded bg-amber/15 px-2 py-1 text-xs font-medium text-amber">
                      Risk {persona.riskWeight.toFixed(2)}
                    </span>
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex items-start gap-3 rounded border border-slate-200 bg-white p-4">
          <FlaskConical className="mt-0.5 h-5 w-5 text-moss" />
          <p className="text-sm text-slate-600">
            Demo-Safe Mode targets `/demo-app/account-settings` and forces the account email oracle.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded border border-slate-200 bg-white p-4">
          <Shield className="mt-0.5 h-5 w-5 text-moss" />
          <p className="text-sm text-slate-600">Sentry receives trace metadata, not full target-page content.</p>
        </div>
        <div className="flex items-start gap-3 rounded border border-coral/30 bg-coral/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-coral" />
          <p className="text-sm text-slate-700">Do not test production apps with real credentials during demo.</p>
        </div>
      </div>

      {error ? <p className="rounded border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p> : null}

      <button
        className="focus-ring inline-flex items-center gap-2 rounded bg-ink px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isSubmitting || selected.length === 0}
        type="submit"
      >
        <Play className="h-4 w-4" />
        {isSubmitting ? "Creating..." : "Create run"}
      </button>
    </form>
  );
}
