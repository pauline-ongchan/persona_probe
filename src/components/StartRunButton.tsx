"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, RefreshCw } from "lucide-react";

export function StartRunButton({ runId, disabled }: { runId: string; disabled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startRun() {
    setError(null);
    setIsStarting(true);

    try {
      const response = await fetch(`/api/runs/${runId}/start`, { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Could not start run.");
        return;
      }

      startTransition(() => router.refresh());
    } catch {
      setError("Could not start run.");
    } finally {
      setIsStarting(false);
    }
  }

  const isBusy = isStarting || isPending;
  const status = isStarting
    ? "Starting browser sessions and persona checks..."
    : isPending
      ? "Updating run results..."
      : null;

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        className="focus-ring inline-flex items-center gap-2 rounded bg-ink px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled || isBusy}
        onClick={startRun}
        type="button"
      >
        {isBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {isStarting ? "Starting execution..." : isPending ? "Updating..." : "Start execution"}
      </button>
      {status ? <p className="text-sm text-slate-500">{status}</p> : null}
      {error ? <p className="text-sm text-coral">{error}</p> : null}
    </div>
  );
}
