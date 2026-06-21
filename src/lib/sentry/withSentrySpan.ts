import * as Sentry from "@sentry/nextjs";

type Primitive = string | number | boolean | null | undefined;

export type SafeSpanAttributes = Record<string, Primitive>;

export function ensureSentryServer() {
  if (Sentry.getClient() || !process.env.SENTRY_DSN) {
    return Boolean(Sentry.getClient());
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    enableLogs: true,
    sendDefaultPii: false
  });

  return Boolean(Sentry.getClient());
}

export async function withSentrySpan<T>(
  name: string,
  attributes: SafeSpanAttributes,
  fn: () => Promise<T>,
  op = name
): Promise<T> {
  ensureSentryServer();

  return Sentry.startSpan(
    {
      name,
      op,
      attributes: compactAttributes(attributes)
    },
    async (span) => {
      try {
        return await fn();
      } catch (error) {
        span.setStatus({ code: 2, message: error instanceof Error ? error.message : "Unknown error" });
        Sentry.captureException(error, { tags: compactTags(attributes) });
        throw error;
      }
    }
  );
}

export function setSafeTags(attributes: SafeSpanAttributes) {
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== null) {
      Sentry.setTag(key, String(value));
    }
  }
}

function compactAttributes(attributes: SafeSpanAttributes) {
  return Object.fromEntries(
    Object.entries(attributes).filter(([, value]) => value !== undefined && value !== null)
  ) as Record<string, string | number | boolean>;
}

function compactTags(attributes: SafeSpanAttributes) {
  return Object.fromEntries(
    Object.entries(attributes)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key.replace(/\./g, "_"), String(value)])
  );
}
