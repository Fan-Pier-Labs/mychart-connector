/**
 * Anonymous usage telemetry, modelled after Next.js / Vercel CLI:
 *
 * - One stable random UUID per project install, stored in the consumer's
 *   `node_modules/.cache/mychart-cli/anonymous-id` (the same
 *   convention Babel / ESLint / Webpack use for tooling cache). Never
 *   derived from identifying information.
 * - Event payload is event name + properties + OS platform/arch +
 *   runtime version. No public IP, no OS hostname, no git config.
 * - Opt out by setting `MYCHART_CLI_TELEMETRY_DISABLED` to any
 *   truthy value.
 *
 * Fire-and-forget. Never throws, never blocks the caller.
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

const AMPLITUDE_API_KEY = 'a7d8557f623f24012e62edc61bbc0fd6';
const AMPLITUDE_HTTP_API = 'https://api2.amplitude.com/2/httpapi';

function isTelemetryDisabled(): boolean {
  return Boolean(process.env.MYCHART_CLI_TELEMETRY_DISABLED);
}

/**
 * Locate the nearest `node_modules` directory by walking up from
 * `process.cwd()`. Returns the cache subdirectory we'd use, or `null`
 * if no `node_modules` is reachable (in which case we won't persist
 * the anonymous ID at all).
 */
function findNodeModulesCacheDir(): string | null {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    const nm = path.join(dir, 'node_modules');
    if (fs.existsSync(nm)) {
      return path.join(nm, '.cache', 'mychart-cli');
    }
    dir = path.dirname(dir);
  }
  return null;
}

/**
 * Read or create a stable random UUID stored on disk. The ID is not
 * derived from any identifying information; it exists purely to dedupe
 * events from the same project install.
 */
function getAnonymousId(): string {
  const cacheDir = findNodeModulesCacheDir();
  if (!cacheDir) {
    // No node_modules nearby (running from outside any project).
    // Fall back to a per-process UUID — telemetry still works, just
    // won't dedupe across runs.
    return randomUUID();
  }
  const idFile = path.join(cacheDir, 'anonymous-id');
  try {
    if (fs.existsSync(idFile)) {
      const cached = fs.readFileSync(idFile, 'utf8').trim();
      if (cached) return cached;
    }
    fs.mkdirSync(cacheDir, { recursive: true });
    const fresh = randomUUID();
    fs.writeFileSync(idFile, fresh, { encoding: 'utf8', mode: 0o600 });
    return fresh;
  } catch {
    // Read-only FS / permission denied — fall back to per-process UUID.
    return randomUUID();
  }
}

export interface EnvInfo {
  platform: string;
  arch: string;
  runtime_version: string;
  os_version: string;
}

/** Gather non-identifying environment info. */
export function gatherEnvInfo(): EnvInfo {
  return {
    platform: os.platform(),
    arch: os.arch(),
    runtime_version:
      typeof Bun !== 'undefined' ? `bun ${Bun.version}` : `node ${process.version}`,
    os_version: os.release(),
  };
}

/**
 * Send a telemetry event to Amplitude via the HTTP API.
 * Fire-and-forget. Never throws. Returns immediately when telemetry is
 * disabled via `MYCHART_CLI_TELEMETRY_DISABLED`.
 */
export function sendTelemetryEvent(
  eventType: string,
  eventProperties: Record<string, unknown> = {},
): void {
  if (isTelemetryDisabled()) return;

  void (async () => {
    try {
      const envInfo = gatherEnvInfo();
      const payload = {
        api_key: AMPLITUDE_API_KEY,
        events: [
          {
            device_id: getAnonymousId(),
            event_type: eventType,
            time: Date.now(),
            platform: envInfo.platform,
            os_name: envInfo.platform,
            os_version: envInfo.os_version,
            event_properties: {
              ...eventProperties,
              arch: envInfo.arch,
              runtime_version: envInfo.runtime_version,
            },
          },
        ],
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch(AMPLITUDE_HTTP_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch {
      // Silently ignore — telemetry must never break the app.
    }
  })();
}
