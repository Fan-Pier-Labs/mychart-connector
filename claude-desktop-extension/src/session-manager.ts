/**
 * Multi-account session manager for the OpenRecord MCPB.
 *
 * - One `MyChartRequest` per hostname, kept warm via keepalive pings.
 * - On first use: try saved passkey, fall back to saved user/pass + TOTP (if any).
 * - Auto-recovers from expiry by re-running login on the next call.
 * - Persists cookie state to disk after login so a Claude Desktop restart
 *   doesn't force a fresh login.
 *
 * Mirrors the model in openclaw-plugin/src/index.ts:62-258 but bound to
 * the MCPB's own credential-store rather than the OpenClaw config file.
 */

import { MyChartRequest } from '../../scrapers/myChart/myChartRequest';
import {
  myChartUserPassLogin,
  myChartPasskeyLogin,
  complete2faFlow,
  areCookiesValid,
} from '../../scrapers/myChart/login';
import { generateTotpCode } from '../../scrapers/myChart/totp';
import {
  deserializeCredential,
  serializeCredential,
} from '../../scrapers/myChart/softwareAuthenticator';
import {
  type AccountConfig,
  findAccount,
  readAccounts,
  readAccountPasskey,
  readAccountSession,
  saveAccountPasskey,
  saveAccountSession,
  clearAccountPasskey,
  clearAccountSession,
  normalizeHostname,
} from './credential-store';

interface SessionEntry {
  session: MyChartRequest;
  expired: boolean;
  keepAliveCounter: number;
  keepAliveErrorCount: number;
  keepAliveInterval: ReturnType<typeof setInterval> | null;
}

const sessions = new Map<string, SessionEntry>();
const loginLocks = new Map<string, Promise<MyChartRequest>>();
let activeAccountHostname: string | null = null;

const KEEPALIVE_INTERVAL_MS = 30_000;
const KEEPALIVE_MAX_ERRORS = 3;

// ── Active account selection ────────────────────────────────────────────────

export function setActiveAccount(hostname: string): void {
  activeAccountHostname = normalizeHostname(hostname);
}

export function getActiveAccount(): string | null {
  return activeAccountHostname;
}

export function clearActiveAccount(): void {
  activeAccountHostname = null;
}

export function isConnected(hostname: string): boolean {
  const entry = sessions.get(normalizeHostname(hostname));
  return !!entry && !entry.expired;
}

export function clearSession(hostname: string): void {
  const key = normalizeHostname(hostname);
  const entry = sessions.get(key);
  if (entry?.keepAliveInterval) clearInterval(entry.keepAliveInterval);
  sessions.delete(key);
  loginLocks.delete(key);
}

export function clearAllSessions(): void {
  for (const [, entry] of sessions) {
    if (entry.keepAliveInterval) clearInterval(entry.keepAliveInterval);
  }
  sessions.clear();
  loginLocks.clear();
}

// ── Login (passkey → user/pass + optional TOTP) ─────────────────────────────

/**
 * Try to restore a session from the on-disk cookie cache. Returns null if
 * no cache exists or the cached cookies have expired.
 */
async function tryRestoreSession(hostname: string): Promise<MyChartRequest | null> {
  const cached = readAccountSession(hostname);
  if (!cached) return null;
  try {
    const req = await MyChartRequest.unserialize(cached);
    if (!req) return null;
    if (await areCookiesValid(req)) return req;
  } catch {
    // fall through
  }
  clearAccountSession(hostname);
  return null;
}

async function loginAccount(account: AccountConfig): Promise<MyChartRequest> {
  const hostname = normalizeHostname(account.hostname);

  // 0. Try on-disk cookie cache first
  const restored = await tryRestoreSession(hostname);
  if (restored) return restored;

  const passkeySerialized = readAccountPasskey(hostname);

  // 1. Passkey (skips 2FA)
  if (passkeySerialized) {
    try {
      const credential = deserializeCredential(passkeySerialized);
      const result = await myChartPasskeyLogin({ hostname, credential });
      if (result.state === 'logged_in') {
        saveAccountPasskey(hostname, serializeCredential(credential));
        await persistSession(hostname, result.mychartRequest);
        return result.mychartRequest;
      }
      console.error(`[openrecord:${hostname}] passkey login failed (${result.state}), falling back to user/pass`);
      clearAccountPasskey(hostname);
    } catch (err) {
      console.error(`[openrecord:${hostname}] passkey login error: ${(err as Error).message}, falling back to user/pass`);
      clearAccountPasskey(hostname);
    }
  }

  // 2. Username + password (+ TOTP if configured)
  const userPass = await myChartUserPassLogin({
    hostname,
    user: account.username,
    pass: account.password,
    skipSendCode: !!account.totpSecret,
  });

  if (userPass.state === 'logged_in') {
    await persistSession(hostname, userPass.mychartRequest);
    return userPass.mychartRequest;
  }

  if (userPass.state === 'invalid_login') {
    throw new Error(`Login failed for ${hostname}: username or password is incorrect. Run setup_account to update credentials.`);
  }

  if (userPass.state === 'need_2fa') {
    if (account.totpSecret) {
      const code = await generateTotpCode(account.totpSecret);
      const twoFa = await complete2faFlow({
        mychartRequest: userPass.mychartRequest,
        code,
        isTOTP: true,
      });
      if (twoFa.state === 'logged_in') {
        await persistSession(hostname, twoFa.mychartRequest);
        return twoFa.mychartRequest;
      }
      throw new Error(`TOTP rejected for ${hostname} (${twoFa.state}). Run setup_account to refresh.`);
    }
    throw new Error(`MyChart requires 2FA for ${hostname} and no passkey or TOTP is saved. Run setup_account to register one.`);
  }

  throw new Error(`Login failed for ${hostname}: ${userPass.state}${userPass.error ? ` — ${userPass.error}` : ''}`);
}

async function persistSession(hostname: string, req: MyChartRequest): Promise<void> {
  try {
    saveAccountSession(hostname, await req.serialize());
  } catch (err) {
    console.error(`[openrecord:${hostname}] failed to persist session: ${(err as Error).message}`);
  }
}

// ── Per-account session lifecycle (keepalive + lazy login) ──────────────────

async function ensureAccountSession(account: AccountConfig): Promise<MyChartRequest> {
  const key = normalizeHostname(account.hostname);
  const entry = sessions.get(key);

  if (entry && !entry.expired) return entry.session;
  if (entry) clearSession(key);

  const lock = loginLocks.get(key);
  if (lock) return lock;

  const promise = loginAccount(account).then(session => {
    const newEntry: SessionEntry = {
      session,
      expired: false,
      keepAliveCounter: 0,
      keepAliveErrorCount: 0,
      keepAliveInterval: null,
    };

    newEntry.keepAliveInterval = setInterval(async () => {
      if (newEntry.expired) return;
      newEntry.keepAliveCounter++;
      try {
        const [a, b] = await Promise.all([
          session.makeRequest({ path: `/Home/KeepAlive?cnt=${newEntry.keepAliveCounter}`, followRedirects: false }),
          session.makeRequest({ path: `/keepalive.asp?cnt=${newEntry.keepAliveCounter}`, followRedirects: false }),
        ]);
        const aBody = await a.text();
        if (aBody.trim() === '0') {
          newEntry.expired = true;
          clearAccountSession(key);
        } else if (a.status !== 200 && b.status !== 200) {
          newEntry.expired = true;
          clearAccountSession(key);
        } else {
          newEntry.keepAliveErrorCount = 0;
        }
      } catch {
        newEntry.keepAliveErrorCount++;
        if (newEntry.keepAliveErrorCount >= KEEPALIVE_MAX_ERRORS) {
          newEntry.expired = true;
          newEntry.keepAliveErrorCount = 0;
          clearAccountSession(key);
        }
      }
    }, KEEPALIVE_INTERVAL_MS);

    sessions.set(key, newEntry);
    loginLocks.delete(key);
    return session;
  }).catch(err => {
    loginLocks.delete(key);
    throw err;
  });

  loginLocks.set(key, promise);
  return promise;
}

/**
 * Get a logged-in MyChartRequest for a specific hostname (if provided) or
 * the auto-selected account (single account → that one; multiple connected
 * → active account; otherwise error asking the agent to pick one).
 */
export async function resolveSession(hostname?: string): Promise<MyChartRequest> {
  const accounts = readAccounts();
  if (accounts.length === 0) {
    throw new Error('No MyChart accounts configured. Use the setup_account tool to add one.');
  }

  if (hostname) {
    const found = findAccount(hostname);
    if (!found) {
      const available = accounts.map(a => a.hostname).join(', ');
      throw new Error(`Account '${hostname}' not found. Available: ${available}`);
    }
    return ensureAccountSession(found);
  }

  if (accounts.length === 1) {
    return ensureAccountSession(accounts[0]);
  }

  // Multiple accounts — prefer the active one
  if (activeAccountHostname) {
    const active = findAccount(activeAccountHostname);
    if (active) return ensureAccountSession(active);
  }

  // Try to auto-connect everything; if exactly one ends up reachable, use it
  await Promise.all(accounts.map(a => ensureAccountSession(a).catch(() => null)));
  const connected = accounts.filter(a => isConnected(a.hostname));
  if (connected.length === 1) return ensureAccountSession(connected[0]);

  throw new Error(
    `Multiple MyChart accounts configured (${accounts.map(a => a.hostname).join(', ')}). ` +
    `Use select_account to pick one before calling other tools.`,
  );
}
