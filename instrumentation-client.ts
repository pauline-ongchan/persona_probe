import * as Sentry from "@sentry/nextjs";
import { getSentryTracesSampleRate } from "./src/lib/sentry/config";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  tracesSampleRate: getSentryTracesSampleRate(),
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true,
  sendDefaultPii: false,
  integrations: [Sentry.replayIntegration()]
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
