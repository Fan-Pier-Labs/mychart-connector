/**
 * Shared telemetry module for server-side / CLI analytics via Amplitude HTTP API.
 *
 * All functions are fire-and-forget and will never throw or block the caller.
 */

import * as os from 'os';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

const AMPLITUDE_API_KEY = 'a7d8557f623f24012e62edc61bbc0fd6';
const AMPLITUDE_HTTP_API = 'https://api2.amplitude.com/2/httpapi';

/** A stable anonymous device ID derived from hostname + username. */
function getDeviceId(): string {
  const raw = `${os.hostname()}-${os.userInfo().username}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

/** Read a git config value, returns null on failure. */
function getGitConfig(key: string): string | null {
  try {
    return execSync(`git config ${key}`, { encoding: 'utf8', timeout: 2000, stdio: 'pipe' }).trim() || null;
  } catch {
    return null;
  }
}

export interface EnvInfo {
  public_ip: string | null;
  platform: string;
  arch: string;
  runtime_version: string;
  os_version: string;
  hostname: string;
  git_user_name: string | null;
  git_user_email: string | null;
  env_user: string | null;
}

/**
 * Gather environment info (public IP, platform, arch, runtime version, git identity).
 * The public IP fetch has a short timeout so it won't block.
 */
export async function gatherEnvInfo(): Promise<EnvInfo> {
  let publicIp: string | null = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json() as { ip: string };
    publicIp = data.ip;
  } catch {
    // best-effort
  }

  return {
    public_ip: publicIp,
    platform: os.platform(),
    arch: os.arch(),
    runtime_version: typeof Bun !== 'undefined' ? `bun ${Bun.version}` : `node ${process.version}`,
    os_version: os.release(),
    hostname: os.hostname(),
    git_user_name: getGitConfig('user.name'),
    git_user_email: getGitConfig('user.email'),
    env_user: process.env.USER || process.env.USERNAME || null,
  };
}

/**
 * Send a telemetry event to Amplitude via the HTTP API.
 * Completely non-blocking and fire-and-forget. Never throws.
 */
export function sendTelemetryEvent(
  eventType: string,
  eventProperties: Record<string, unknown> = {},
): void {
  // Fire-and-forget — wrapped in an async IIFE that catches all errors
  void (async () => {
    try {
      const envInfo = await gatherEnvInfo();
      const payload = {
        api_key: AMPLITUDE_API_KEY,
        events: [
          {
            device_id: getDeviceId(),
            event_type: eventType,
            time: Date.now(),
            platform: envInfo.platform,
            os_name: envInfo.platform,
            os_version: envInfo.os_version,
            user_properties: {
              git_user_name: envInfo.git_user_name,
              git_user_email: envInfo.git_user_email,
              env_user: envInfo.env_user,
            },
            event_properties: {
              ...eventProperties,
              public_ip: envInfo.public_ip,
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
      // Silently ignore — telemetry must never break the app
    }
  })();
}
