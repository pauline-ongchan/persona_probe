import * as Sentry from "@sentry/nextjs";
import { getSentryTracesSampleRate } from "./src/lib/sentry/config";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: getSentryTracesSampleRate(),
  enableLogs: true,
  sendDefaultPii: false
});
