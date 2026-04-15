/**
 * CLI Integration Tests — Passkey Setup & Removal
 *
 * Tests that the CLI can set up and remove passkeys on a fake-mychart
 * server running in Docker Compose (or locally).
 *
 * Requires fake-mychart running on port 4000 (FAKE_MYCHART_ACCEPT_ANY=true).
 *
 * Run: bun test tests/integration/ci/cli-passkey.test.ts
 */

import { describe, it, expect, afterAll, beforeAll } from 'bun:test';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const FAKE_MYCHART_HOST = process.env.CI_FAKE_MYCHART_CLI_HOST || 'localhost:4000';
const FAKE_MYCHART_URL = process.env.CI_FAKE_MYCHART_URL || 'http://localhost:4000';
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const CLI_ENTRY = path.join(PROJECT_ROOT, 'cli', 'entry.ts');

// Temp dirs for passkey/TOTP credential storage (avoid polluting real dirs)
const TEMP_DIR = fs.mkdtempSync(path.join(PROJECT_ROOT, '.test-cli-passkey-'));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runCli(args: string[], timeoutMs = 30_000): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', ['run', CLI_ENTRY, ...args], {
      cwd: TEMP_DIR,
      env: {
        ...process.env,
        // Use temp dir as working directory so .passkey-credentials/ is created there
        HOME: TEMP_DIR,
      },
      timeout: timeoutMs,
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });

    proc.on('error', (err) => {
      resolve({ code: 1, stdout, stderr: stderr + '\n' + err.message });
    });
  });
}

async function loginToFakeMychart(): Promise<string> {
  const loginRes = await fetch(`${FAKE_MYCHART_URL}/MyChart/Authentication/Login/DoLogin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `LoginInfo=${encodeURIComponent(JSON.stringify({
      Credentials: {
        Username: btoa('homer'),
        Password: btoa('donuts123'),
      },
    }))}`,
    redirect: 'manual',
  });
  const setCookie = loginRes.headers.getSetCookie?.() ?? [];
  const sessionCookie = setCookie.find(c => c.startsWith('MyChartSession='));
  if (!sessionCookie) {
    throw new Error('Failed to get session cookie from fake-mychart');
  }
  return sessionCookie.split(';')[0];
}

async function getPasskeysFromFakeMychart(): Promise<unknown[]> {
  const cookieValue = await loginToFakeMychart();
  const res = await fetch(`${FAKE_MYCHART_URL}/MyChart/api/passkey-management/LoadPasskeyInfo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookieValue },
    body: '{}',
  });
  const data = await res.json() as { passkeys?: unknown[] };
  return data.passkeys || [];
}

async function deleteAllPasskeysFromFakeMychart(): Promise<void> {
  const cookieValue = await loginToFakeMychart();
  const res = await fetch(`${FAKE_MYCHART_URL}/MyChart/api/passkey-management/LoadPasskeyInfo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookieValue },
    body: '{}',
  });
  const data = await res.json() as { passkeys?: Array<{ rawId: string }> };
  for (const pk of data.passkeys || []) {
    await fetch(`${FAKE_MYCHART_URL}/MyChart/api/passkey-management/DeletePasskey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookieValue },
      body: JSON.stringify({ rawId: pk.rawId }),
    });
  }
}

async function getTotpStatusFromFakeMychart(): Promise<boolean> {
  const cookieValue = await loginToFakeMychart();
  const res = await fetch(`${FAKE_MYCHART_URL}/MyChart/api/secondary-validation/GetTwoFactorInfo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookieValue },
    body: '{}',
  });
  const data = await res.json() as { IsTotpEnabled?: boolean };
  return data.IsTotpEnabled ?? false;
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

afterAll(() => {
  // Clean up temp directory
  try {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CLI passkey operations against fake-mychart', () => {
  // Clean up any passkeys left over from a previous test run
  beforeAll(async () => {
    try { await deleteAllPasskeysFromFakeMychart(); } catch { /* server may not be up yet */ }
  });

  it('health check — fake-mychart is reachable', async () => {
    const res = await fetch(`${FAKE_MYCHART_URL}/api/health`);
    expect(res.ok).toBe(true);
  });

  it('no passkeys exist initially', async () => {
    const passkeys = await getPasskeysFromFakeMychart();
    expect(passkeys.length).toBe(0);
  });

  it('CLI --set-up-passkey registers a passkey', async () => {
    const result = await runCli([
      '--host', FAKE_MYCHART_HOST,
      '--user', 'homer',
      '--pass', 'donuts123',
      '--local',
      '--no-cache',
      '--set-up-passkey',
    ], 60_000);

    // CLI should succeed
    const output = result.stdout + result.stderr;
    expect(output).toContain('passkey');
    expect(result.code).toBe(0);
  }, 60_000);

  it('passkey exists on fake-mychart after setup', async () => {
    const passkeys = await getPasskeysFromFakeMychart();
    expect(passkeys.length).toBe(1);
  });

  it('CLI --list-passkeys shows the registered passkey', async () => {
    const result = await runCli([
      '--host', FAKE_MYCHART_HOST,
      '--user', 'homer',
      '--pass', 'donuts123',
      '--local',
      '--no-cache',
      '--list-passkeys',
    ], 60_000);

    const output = result.stdout + result.stderr;
    expect(output).toContain('1 passkey');
    expect(result.code).toBe(0);
  }, 60_000);

  it('CLI --delete-passkey removes the passkey', async () => {
    const result = await runCli([
      '--host', FAKE_MYCHART_HOST,
      '--user', 'homer',
      '--pass', 'donuts123',
      '--local',
      '--no-cache',
      '--delete-passkey',
    ], 60_000);

    const output = result.stdout + result.stderr;
    expect(output).toContain('Deleted passkey');
    expect(result.code).toBe(0);
  }, 60_000);

  it('no passkeys on fake-mychart after deletion', async () => {
    const passkeys = await getPasskeysFromFakeMychart();
    expect(passkeys.length).toBe(0);
  });
});

describe('CLI TOTP operations against fake-mychart', () => {
  it('TOTP is disabled initially', async () => {
    const enabled = await getTotpStatusFromFakeMychart();
    expect(enabled).toBe(false);
  });

  it('CLI --set-up-totp enables TOTP', async () => {
    const result = await runCli([
      '--host', FAKE_MYCHART_HOST,
      '--user', 'homer',
      '--pass', 'donuts123',
      '--local',
      '--no-cache',
      '--set-up-totp',
    ], 60_000);

    const output = result.stdout + result.stderr;
    expect(output).toContain('TOTP setup complete');
    expect(result.code).toBe(0);
  }, 60_000);

  it('TOTP is enabled on fake-mychart after setup', async () => {
    const enabled = await getTotpStatusFromFakeMychart();
    expect(enabled).toBe(true);
  });

  it('CLI --disable-totp disables TOTP', async () => {
    const result = await runCli([
      '--host', FAKE_MYCHART_HOST,
      '--user', 'homer',
      '--pass', 'donuts123',
      '--local',
      '--no-cache',
      '--disable-totp',
    ], 60_000);

    const output = result.stdout + result.stderr;
    expect(output).toContain('TOTP disabled');
    expect(result.code).toBe(0);
  }, 60_000);

  it('TOTP is disabled on fake-mychart after disable', async () => {
    const enabled = await getTotpStatusFromFakeMychart();
    expect(enabled).toBe(false);
  });
});
