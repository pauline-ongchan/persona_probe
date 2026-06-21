const DEFAULT_TRACES_SAMPLE_RATE = 1.0;

export function getSentryTracesSampleRate() {
  const raw = process.env.SENTRY_TRACES_SAMPLE_RATE || process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE;
  if (!raw) return DEFAULT_TRACES_SAMPLE_RATE;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_TRACES_SAMPLE_RATE;

  return Math.max(0, Math.min(1, parsed));
}
