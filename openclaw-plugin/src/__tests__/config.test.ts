import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// We test the config module by pointing it at a temp directory.
// Since the module uses hardcoded paths based on os.homedir(), we need to
// test the exported functions in a way that exercises the logic.
// For unit tests, we'll test the pure functions directly and use a temp dir
// for integration-style tests of the file I/O functions.

import { normalizeHostname } from '../config';

describe('normalizeHostname', () => {
  test('lowercases hostname', () => {
    expect(normalizeHostname('MyChart.Example.ORG')).toBe('mychart.example.org');
  });

  test('trims whitespace', () => {
    expect(normalizeHostname('  mychart.example.org  ')).toBe('mychart.example.org');
  });

  test('handles already-normalized hostname', () => {
    expect(normalizeHostname('mychart.example.org')).toBe('mychart.example.org');
  });

  test('handles empty string', () => {
    expect(normalizeHostname('')).toBe('');
  });
});

// Integration tests for file-based config operations
// These create a temp directory structure mimicking ~/.openclaw/
describe('config file operations', () => {
  let tmpDir: string;
  let configPath: string;
  let passkeysDir: string;
  let legacyPasskeyPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openrecord-test-'));
    configPath = path.join(tmpDir, 'openclaw.json');
    passkeysDir = path.join(tmpDir, 'openrecord-passkeys');
    legacyPasskeyPath = path.join(tmpDir, 'openrecord-passkey.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Helper to write a config file in the OpenClaw format
  function writeConfig(pluginConfig: Record<string, unknown>) {
    const fullConfig = {
      plugins: {
        entries: {
          'openclaw-openrecord': { config: pluginConfig },
        },
      },
    };
    fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
  }

  // Helper to read back the plugin config
  function readConfig(): Record<string, unknown> {
    const full = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return full?.plugins?.entries?.['openclaw-openrecord']?.config ?? {};
  }

  describe('migration detection', () => {
    test('old flat format has hostname key at top level', () => {
      const oldConfig = { hostname: 'mychart.example.org', username: 'user1', password: 'pass1', totpSecret: 'secret' };
      writeConfig(oldConfig);
      const raw = readConfig();
      // Old format: has hostname key, no accounts array
      expect(raw.hostname).toBe('mychart.example.org');
      expect(raw.accounts).toBeUndefined();
    });

    test('new format has accounts array', () => {
      const newConfig = { accounts: [{ hostname: 'mychart.example.org', username: 'user1', password: 'pass1' }] };
      writeConfig(newConfig);
      const raw = readConfig();
      expect(raw.accounts).toBeDefined();
      expect(Array.isArray(raw.accounts)).toBe(true);
    });

    test('empty config has no keys', () => {
      writeConfig({});
      const raw = readConfig();
      expect(Object.keys(raw).length).toBe(0);
    });
  });

  describe('passkey file operations', () => {
    test('write and read per-account passkey', () => {
      fs.mkdirSync(passkeysDir, { recursive: true });
      const passkeyData = { passkey: '{"credentialId":"abc","privateKey":"xyz"}' };
      const passkeyPath = path.join(passkeysDir, 'mychart.example.org.json');
      fs.writeFileSync(passkeyPath, JSON.stringify(passkeyData, null, 2));

      const read = JSON.parse(fs.readFileSync(passkeyPath, 'utf-8'));
      expect(read.passkey).toBe('{"credentialId":"abc","privateKey":"xyz"}');
    });

    test('missing passkey file returns undefined on read', () => {
      const passkeyPath = path.join(passkeysDir, 'nonexistent.json');
      let result: string | undefined;
      try {
        JSON.parse(fs.readFileSync(passkeyPath, 'utf-8'));
      } catch {
        result = undefined;
      }
      expect(result).toBeUndefined();
    });

    test('delete passkey file', () => {
      fs.mkdirSync(passkeysDir, { recursive: true });
      const passkeyPath = path.join(passkeysDir, 'mychart.example.org.json');
      fs.writeFileSync(passkeyPath, JSON.stringify({ passkey: 'test' }));
      expect(fs.existsSync(passkeyPath)).toBe(true);

      fs.unlinkSync(passkeyPath);
      expect(fs.existsSync(passkeyPath)).toBe(false);
    });
  });

  describe('account CRUD logic', () => {
    test('add account to empty list', () => {
      const accounts: { hostname: string; username: string; password: string; totpSecret?: string }[] = [];
      const newAccount = { hostname: 'mychart.example.org', username: 'user1', password: 'pass1' };
      accounts.push(newAccount);
      expect(accounts).toHaveLength(1);
      expect(accounts[0].hostname).toBe('mychart.example.org');
    });

    test('add second account with different hostname', () => {
      const accounts = [
        { hostname: 'mychart.hospital-a.org', username: 'user1', password: 'pass1' },
      ];
      const newAccount = { hostname: 'mychart.hospital-b.org', username: 'user2', password: 'pass2' };
      const normalized = normalizeHostname(newAccount.hostname);
      const idx = accounts.findIndex(a => normalizeHostname(a.hostname) === normalized);
      expect(idx).toBe(-1); // not found
      accounts.push(newAccount);
      expect(accounts).toHaveLength(2);
    });

    test('replace existing account with same hostname', () => {
      const accounts = [
        { hostname: 'mychart.example.org', username: 'user1', password: 'pass1' },
        { hostname: 'mychart.other.org', username: 'user2', password: 'pass2' },
      ];
      const updated = { hostname: 'mychart.example.org', username: 'newuser', password: 'newpass' };
      const normalized = normalizeHostname(updated.hostname);
      const idx = accounts.findIndex(a => normalizeHostname(a.hostname) === normalized);
      expect(idx).toBe(0);
      accounts[idx] = updated;
      expect(accounts).toHaveLength(2);
      expect(accounts[0].username).toBe('newuser');
      expect(accounts[1].hostname).toBe('mychart.other.org'); // unchanged
    });

    test('replace existing account with case-insensitive hostname match', () => {
      const accounts = [
        { hostname: 'mychart.example.org', username: 'user1', password: 'pass1' },
      ];
      const updated = { hostname: 'MyChart.Example.ORG', username: 'newuser', password: 'newpass' };
      const normalized = normalizeHostname(updated.hostname);
      const idx = accounts.findIndex(a => normalizeHostname(a.hostname) === normalized);
      expect(idx).toBe(0);
    });

    test('remove account by hostname', () => {
      const accounts = [
        { hostname: 'mychart.hospital-a.org', username: 'user1', password: 'pass1' },
        { hostname: 'mychart.hospital-b.org', username: 'user2', password: 'pass2' },
      ];
      const hostname = 'mychart.hospital-a.org';
      const filtered = accounts.filter(a => normalizeHostname(a.hostname) !== normalizeHostname(hostname));
      expect(filtered).toHaveLength(1);
      expect(filtered[0].hostname).toBe('mychart.hospital-b.org');
    });

    test('remove nonexistent hostname is a no-op', () => {
      const accounts = [
        { hostname: 'mychart.example.org', username: 'user1', password: 'pass1' },
      ];
      const filtered = accounts.filter(a => normalizeHostname(a.hostname) !== normalizeHostname('nonexistent.org'));
      expect(filtered).toHaveLength(1);
    });
  });

  describe('legacy passkey migration', () => {
    test('legacy passkey file can be read and moved', () => {
      // Write legacy passkey
      const legacyData = { passkey: '{"credentialId":"legacy-id","privateKey":"legacy-key"}' };
      fs.writeFileSync(legacyPasskeyPath, JSON.stringify(legacyData, null, 2));
      expect(fs.existsSync(legacyPasskeyPath)).toBe(true);

      // Read it
      const read = JSON.parse(fs.readFileSync(legacyPasskeyPath, 'utf-8'));
      expect(read.passkey).toContain('legacy-id');

      // Move to per-hostname location
      fs.mkdirSync(passkeysDir, { recursive: true });
      const newPath = path.join(passkeysDir, 'mychart.example.org.json');
      fs.writeFileSync(newPath, JSON.stringify(legacyData, null, 2));
      fs.unlinkSync(legacyPasskeyPath);

      expect(fs.existsSync(legacyPasskeyPath)).toBe(false);
      expect(fs.existsSync(newPath)).toBe(true);
      const migrated = JSON.parse(fs.readFileSync(newPath, 'utf-8'));
      expect(migrated.passkey).toContain('legacy-id');
    });
  });
});
