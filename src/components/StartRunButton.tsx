"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, RefreshCw } from "lucide-react";

export function StartRunButton({ runId, disabled }: { runId: string; disabled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function startRun() {
    setError(null);
    const response = await fetch(`/api/runs/${runId}/start`, { method: "POST" });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error || "Could not start run.");
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        className="focus-ring inline-flex items-center gap-2 rounded bg-ink px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled || isPending}
        onClick={startRun}
        type="button"
      >
        {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {isPending ? "Refreshing..." : "Start execution"}
      </button>
      {error ? <p className="text-sm text-coral">{error}</p> : null}
    </div>
  );
}
