"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, WandSparkles } from "lucide-react";

export function SelfHealRunButton({ disabled, runId }: { disabled: boolean; runId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function selfHeal() {
    setError(null);
    setIsCreating(true);

    try {
      const response = await fetch(`/api/runs/${runId}/self-heal`, { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Could not create a self-healed run.");
        return;
      }

      startTransition(() => router.push(`/runs/${payload.run.id}`));
    } catch {
      setError("Could not create a self-healed run.");
    } finally {
      setIsCreating(false);
    }
  }

  const isBusy = isCreating || isPending;

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        className="focus-ring inline-flex items-center gap-2 rounded bg-moss px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled || isBusy}
        onClick={selfHeal}
        type="button"
      >
        {isBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
        {isCreating ? "Creating repaired run..." : isPending ? "Opening run..." : "Fix with self-heal"}
      </button>
      {isCreating ? <p className="text-sm text-slate-500">Preparing a repaired flow run...</p> : null}
      {error ? <p className="text-sm text-coral">{error}</p> : null}
    </div>
  );
}
