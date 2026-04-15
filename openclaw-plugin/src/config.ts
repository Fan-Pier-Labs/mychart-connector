/**
 * Multi-account config helpers for reading/writing the OpenClaw plugin config.
 *
 * Config shape (stored at plugins.entries['openclaw-openrecord'].config):
 *   { accounts: [{ hostname, username, password, totpSecret? }, ...] }
 *
 * Passkey credentials are stored per-account in separate files:
 *   ~/.openclaw/openrecord-passkeys/{hostname}.json
 *
 * This avoids the OpenClaw runtime overwriting the signCount when it syncs
 * its in-memory config snapshot back to disk.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const CONFIG_PATH = path.join(os.homedir(), '.openclaw', 'openclaw.json');
const PASSKEYS_DIR = path.join(os.homedir(), '.openclaw', 'openrecord-passkeys');

// Legacy single-passkey path (for migration)
const LEGACY_PASSKEY_PATH = path.join(os.homedir(), '.openclaw', 'openrecord-passkey.json');

// ── Types ────────────────────────────────────────────────────────────────────

export interface AccountConfig {
  hostname: string;
  username: string;
  password: string;
  totpSecret?: string;
}

// ── Hostname normalization ───────────────────────────────────────────────────

export function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().trim();
}

// ── Raw config read/write ────────────────────────────────────────────────────

function readRawPluginConfig(): Record<string, unknown> {
  try {
    const fullConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    return (fullConfig?.plugins?.entries?.['openclaw-openrecord']?.config as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

function writePluginConfig(config: Record<string, unknown>): void {
  let fullConfig: Record<string, unknown>;
  try {
    fullConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    fullConfig = {};
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fc = fullConfig as any;
  fc.plugins ??= {};
  fc.plugins.entries ??= {};
  fc.plugins.entries['openclaw-openrecord'] ??= {};
  fc.plugins.entries['openclaw-openrecord'].config = config;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(fullConfig, null, 2));
}

// ── Migration ────────────────────────────────────────────────────────────────

/**
 * Migrate old flat config format to accounts array.
 * Also moves legacy single passkey file to per-hostname directory.
 * Idempotent — safe to call multiple times.
 */
export function migrateConfig(): void {
  const raw = readRawPluginConfig();

  // Already migrated or empty
  if (Array.isArray(raw.accounts) || Object.keys(raw).length === 0) return;

  // Old flat format: { hostname, username, password, totpSecret? }
  if (typeof raw.hostname === 'string') {
    const hostname = normalizeHostname(raw.hostname as string);
    const account: AccountConfig = {
      hostname,
      username: raw.username as string,
      password: raw.password as string,
    };
    if (raw.totpSecret) account.totpSecret = raw.totpSecret as string;

    writePluginConfig({ accounts: [account] });

    // Migrate legacy passkey file to per-hostname directory
    if (hostname) {
      migrateLegacyPasskey(hostname);
    }
  }
}

function migrateLegacyPasskey(hostname: string): void {
  try {
    const data = fs.readFileSync(LEGACY_PASSKEY_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    if (parsed?.passkey) {
      saveAccountPasskey(hostname, parsed.passkey);
      fs.unlinkSync(LEGACY_PASSKEY_PATH);
    }
  } catch {
    // Legacy passkey file doesn't exist or is invalid — check if passkey was in main config
    try {
      const raw = readRawPluginConfig();
      const accounts = raw.accounts as AccountConfig[] | undefined;
      // Already migrated at this point, so won't find passkey in flat config
      if (!accounts) return;
    } catch {
      // ignore
    }
  }
}

// ── Account CRUD ─────────────────────────────────────────────────────────────

/** Read all configured accounts (migrates old format on first call). */
export function readAccounts(): AccountConfig[] {
  migrateConfig();
  const raw = readRawPluginConfig();
  const accounts = raw.accounts;
  if (!Array.isArray(accounts)) return [];
  return accounts as AccountConfig[];
}

/** Overwrite the full accounts array. */
export function saveAccounts(accounts: AccountConfig[]): void {
  writePluginConfig({ accounts });
}

/** Add or replace an account (matched by hostname). */
export function addAccount(account: AccountConfig): void {
  const accounts = readAccounts();
  const normalized = normalizeHostname(account.hostname);
  const idx = accounts.findIndex(a => normalizeHostname(a.hostname) === normalized);
  const normalizedAccount = { ...account, hostname: normalized };
  if (idx >= 0) {
    accounts[idx] = normalizedAccount;
  } else {
    accounts.push(normalizedAccount);
  }
  saveAccounts(accounts);
}

/** Remove an account by hostname. Returns true if found and removed. */
export function removeAccount(hostname: string): boolean {
  const accounts = readAccounts();
  const normalized = normalizeHostname(hostname);
  const filtered = accounts.filter(a => normalizeHostname(a.hostname) !== normalized);
  if (filtered.length === accounts.length) return false;
  saveAccounts(filtered);
  return true;
}

/** Find an account by hostname. */
export function findAccount(hostname: string): AccountConfig | undefined {
  const normalized = normalizeHostname(hostname);
  return readAccounts().find(a => normalizeHostname(a.hostname) === normalized);
}

// ── Per-account passkey files ────────────────────────────────────────────────

function passkeyPathFor(hostname: string): string {
  return path.join(PASSKEYS_DIR, `${normalizeHostname(hostname)}.json`);
}

/** Read the passkey credential JSON string for a specific account. */
export function readAccountPasskey(hostname: string): string | undefined {
  try {
    const data = JSON.parse(fs.readFileSync(passkeyPathFor(hostname), 'utf-8'));
    return data?.passkey || undefined;
  } catch {
    return undefined;
  }
}

/** Write the passkey credential JSON string for a specific account. */
export function saveAccountPasskey(hostname: string, serialized: string): void {
  fs.mkdirSync(PASSKEYS_DIR, { recursive: true });
  fs.writeFileSync(passkeyPathFor(hostname), JSON.stringify({ passkey: serialized }, null, 2));
}

/** Delete the passkey credential file for a specific account. */
export function clearAccountPasskey(hostname: string): void {
  try { fs.unlinkSync(passkeyPathFor(hostname)); } catch { /* ignore */ }
}

/** Delete all passkey files. */
export function clearAllPasskeys(): void {
  try {
    const files = fs.readdirSync(PASSKEYS_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(PASSKEYS_DIR, file));
    }
    fs.rmdirSync(PASSKEYS_DIR);
  } catch { /* ignore */ }
  // Also clean up legacy file if it still exists
  try { fs.unlinkSync(LEGACY_PASSKEY_PATH); } catch { /* ignore */ }
}

// ── Legacy compat (used during migration only) ──────────────────────────────

/** @deprecated Use readAccountPasskey(hostname) instead. */
export function readPasskey(): string | undefined {
  try {
    const data = JSON.parse(fs.readFileSync(LEGACY_PASSKEY_PATH, 'utf-8'));
    return data?.passkey || undefined;
  } catch {
    // Fall back to OpenClaw config for migration
    const raw = readRawPluginConfig();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (raw as any).passkey || undefined;
  }
}

// ── Exports for testing ──────────────────────────────────────────────────────

export const _testing = {
  CONFIG_PATH,
  PASSKEYS_DIR,
  LEGACY_PASSKEY_PATH,
};
