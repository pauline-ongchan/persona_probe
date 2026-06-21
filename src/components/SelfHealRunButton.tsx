"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, WandSparkles } from "lucide-react";

export function SelfHealRunButton({ disabled, runId }: { disabled: boolean; runId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function selfHeal() {
    setError(null);
    const response = await fetch(`/api/runs/${runId}/self-heal`, { method: "POST" });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error || "Could not create a self-healed run.");
      return;
    }

    startTransition(() => router.push(`/runs/${payload.run.id}`));
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        className="focus-ring inline-flex items-center gap-2 rounded bg-moss px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled || isPending}
        onClick={selfHeal}
        type="button"
      >
        {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
        {isPending ? "Creating fix..." : "Fix with self-heal"}
      </button>
      {error ? <p className="text-sm text-coral">{error}</p> : null}
    </div>
  );
}
