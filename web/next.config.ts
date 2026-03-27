import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import path from "path";

// Parse allowed dev origins from BETTER_AUTH_URL env var (e.g. https://example.ngrok-free.dev -> example.ngrok-free.dev)
const devOrigins: string[] = [];
const authUrl = process.env.BETTER_AUTH_URL;
if (authUrl) {
  try {
    devOrigins.push(new URL(authUrl).hostname);
  } catch { /* ignore invalid URLs */ }
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, ".."),
  ...(devOrigins.length > 0 ? { allowedDevOrigins: devOrigins } : {}),
  typescript: {
    // Type checking runs separately in CI; skip during Docker build to avoid OOM
    ignoreBuildErrors: true,
  },
  // Scrapers live outside web/ and import packages from root node_modules.
  // Tell Next.js to resolve these as external server packages so Turbopack
  // doesn't fail when it can't find them in web/node_modules.
  serverExternalPackages: ["cheerio", "tough-cookie", "fetch-cookie"],

  // Redirect old domain to canonical domain (preserves path)
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'mychart.fanpierlabs.com' }],
        destination: 'https://openrecord.fanpierlabs.com/:path*',
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "fan-pier-labs",

  project: "mychart-connector",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  }
});
