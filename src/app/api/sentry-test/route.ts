import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { ensureSentryServer } from "@/lib/sentry/withSentrySpan";

export const runtime = "nodejs";

export async function GET() {
  const hasClient = ensureSentryServer();
  const eventId = Sentry.captureException(new Error("PersonaProbe Sentry smoke test"));
  const flushed = await Sentry.flush(10_000);

  return NextResponse.json({
    ok: true,
    eventId,
    flushed,
    hasClient,
    hasDsn: Boolean(process.env.SENTRY_DSN),
    message: "Sent a test exception to Sentry. Check Issues for 'PersonaProbe Sentry smoke test'."
  });
}
