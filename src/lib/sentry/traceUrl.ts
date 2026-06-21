export function getSentryTraceUrl(traceId: string, orgSlug?: string | null) {
  const encodedTraceId = encodeURIComponent(traceId);
  const resolvedOrgSlug = orgSlug || process.env.SENTRY_ORG || process.env.NEXT_PUBLIC_SENTRY_ORG;

  if (resolvedOrgSlug) {
    return `https://sentry.io/organizations/${encodeURIComponent(resolvedOrgSlug)}/performance/trace/${encodedTraceId}/`;
  }

  return `https://sentry.io/performance/trace/${encodedTraceId}`;
}
