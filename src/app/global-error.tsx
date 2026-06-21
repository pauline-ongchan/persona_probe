"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
          <div className="max-w-md">
            <p className="text-sm uppercase tracking-[0.2em] text-coral">FlowProof</p>
            <h1 className="mt-3 text-3xl font-semibold">Something went sideways.</h1>
            <p className="mt-3 text-slate-300">
              The error has been captured. Refresh and try the flow again.
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
