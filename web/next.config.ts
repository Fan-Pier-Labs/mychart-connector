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
};

export default nextConfig;
