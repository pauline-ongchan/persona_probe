"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, GitPullRequestDraft, Loader2, Wrench } from "lucide-react";

type FixAttemptSummary = {
  id: string;
  status: string;
  prUrl: string | null;
  errorMessage: string | null;
};

export function CreateFixPrButton({
  testCaseId,
  projectId,
  initialFixAttempt,
  disabled
}: {
  testCaseId: string;
  projectId: string | null;
  initialFixAttempt?: FixAttemptSummary | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [fixAttempt, setFixAttempt] = useState<FixAttemptSummary | null>(initialFixAttempt || null);
  const [error, setError] = useState<string | null>(initialFixAttempt?.errorMessage || null);

  async function createFixPr() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/test-cases/${testCaseId}/fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectId ? { projectId } : {})
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Could not trigger the autofix workflow.");
        if (payload.fixAttempt) setFixAttempt(payload.fixAttempt);
        return;
      }

      setFixAttempt(payload.fixAttempt);
      router.refresh();
    } catch {
      setError("Could not trigger the autofix workflow.");
    } finally {
      setIsLoading(false);
    }
  }

  const hasTriggered = Boolean(fixAttempt && fixAttempt.status !== "FAILED");
  const buttonLabel = isLoading
    ? "Triggering workflow..."
    : hasTriggered
      ? "Autofix workflow triggered"
      : "Create Fix PR";

  return (
    <div className="min-w-48 space-y-2">
      <button
        className="focus-ring inline-flex items-center gap-2 rounded border border-ink px-3 py-2 text-xs font-medium text-ink disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled || isLoading || hasTriggered}
        onClick={createFixPr}
        type="button"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : hasTriggered ? (
          <GitPullRequestDraft className="h-4 w-4" />
        ) : (
          <Wrench className="h-4 w-4" />
        )}
        {buttonLabel}
      </button>
      {isLoading ? <p className="text-xs leading-5 text-slate-500">Dispatching the fix workflow...</p> : null}
      {fixAttempt ? (
        <div className="text-xs text-slate-500">
          <span className="font-medium text-slate-700">{fixAttempt.status.replaceAll("_", " ")}</span>
          {!fixAttempt.prUrl && hasTriggered ? (
            <span className="mt-1 block leading-5">Workflow queued. PR link will appear after GitHub creates it.</span>
          ) : null}
          {fixAttempt.prUrl ? (
            <a
              className="mt-1 inline-flex items-center gap-1 font-medium text-ink"
              href={fixAttempt.prUrl}
              rel="noreferrer"
              target="_blank"
            >
              View PR
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="max-w-64 text-xs leading-5 text-coral">{error}</p> : null}
    </div>
  );
}
