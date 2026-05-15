// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Default to the Fan-Pier-Labs Sentry project. Self-hosters can override
// with the NEXT_PUBLIC_SENTRY_DSN build arg to redirect telemetry to their
// own Sentry project. Uses || (not ??) because an unset Docker ARG produces
// the empty string (not undefined), and we want that to fall through to
// the default.
const DEFAULT_DSN = "https://23bd6ed105e0306ba40b90b8922edc7d@o4509283904323584.ingest.us.sentry.io/4511107880910848";
const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || DEFAULT_DSN;

Sentry.init({
  dsn: DSN,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
