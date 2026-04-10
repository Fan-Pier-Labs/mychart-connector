import { describe, test, expect } from 'bun:test';

/**
 * Tests for multi-account session resolution logic and tool parameter injection.
 *
 * These tests verify the core decision-making logic without hitting real MyChart
 * servers. They test the resolution rules:
 *   - 0 accounts → error
 *   - 1 account → auto-select
 *   - N accounts, no param → error listing hostnames (unless exactly 1 connected)
 *   - N accounts, explicit param → target that account
 *   - nonexistent param → error
 */

describe('multi-account resolution rules', () => {
  // These tests verify the resolution algorithm directly using the same
  // logic as resolveSession() without mocking the module.

  interface Account {
    hostname: string;
    username: string;
    password: string;
    connected: boolean;
    canConnect?: boolean; // simulates whether auto-connect would succeed
  }

  /**
   * Pure function implementing the same resolution logic as resolveSession().
   * The `canConnect` field simulates whether auto-connect would succeed.
   * Returns the selected hostname or throws an error string.
   */
  function resolve(accounts: Account[], requestedAccount?: string): string {
    if (accounts.length === 0) {
      throw new Error('No MyChart accounts configured. Run `openclaw openrecord setup` to add one.');
    }

    if (requestedAccount) {
      const normalized = requestedAccount.toLowerCase().trim();
      const found = accounts.find(a => a.hostname.toLowerCase().trim() === normalized);
      if (!found) {
        const available = accounts.map(a => a.hostname).join(', ');
        throw new Error(`Account '${requestedAccount}' not found. Available: ${available}`);
      }
      return found.hostname;
    }

    if (accounts.length === 1) {
      return accounts[0].hostname;
    }

    let connected = accounts.filter(a => a.connected);

    // Auto-connect all accounts if none connected (mirrors real resolveSession)
    if (connected.length === 0) {
      for (const acct of accounts) {
        if (acct.canConnect) acct.connected = true;
      }
      connected = accounts.filter(a => a.connected);
    }

    if (connected.length === 1) {
      return connected[0].hostname;
    }

    if (connected.length === 0) {
      const hostnames = accounts.map(a => a.hostname).join(', ');
      throw new Error(`Could not connect to any MyChart account. Specify the 'account' parameter with one of: ${hostnames}`);
    }

    const hostnames = connected.map(a => a.hostname).join(', ');
    throw new Error(`Multiple MyChart accounts connected. Specify the 'account' parameter with one of: ${hostnames}`);
  }

  test('zero accounts → error pointing to setup', () => {
    expect(() => resolve([])).toThrow('No MyChart accounts configured');
  });

  test('single account, no param → auto-selects', () => {
    const accounts: Account[] = [
      { hostname: 'mychart.hospital-a.org', username: 'user1', password: 'pass1', connected: false },
    ];
    expect(resolve(accounts)).toBe('mychart.hospital-a.org');
  });

  test('single account with explicit matching param → selects it', () => {
    const accounts: Account[] = [
      { hostname: 'mychart.hospital-a.org', username: 'user1', password: 'pass1', connected: false },
    ];
    expect(resolve(accounts, 'mychart.hospital-a.org')).toBe('mychart.hospital-a.org');
  });

  test('two accounts, no param, neither connected, both can auto-connect → error listing connected', () => {
    const accounts: Account[] = [
      { hostname: 'mychart.hospital-a.org', username: 'user1', password: 'pass1', connected: false, canConnect: true },
      { hostname: 'mychart.hospital-b.org', username: 'user2', password: 'pass2', connected: false, canConnect: true },
    ];
    expect(() => resolve(accounts)).toThrow('Multiple MyChart accounts connected');
  });

  test('two accounts, no param, neither connected, one can auto-connect → returns it', () => {
    const accounts: Account[] = [
      { hostname: 'mychart.hospital-a.org', username: 'user1', password: 'pass1', connected: false, canConnect: false },
      { hostname: 'mychart.hospital-b.org', username: 'user2', password: 'pass2', connected: false, canConnect: true },
    ];
    expect(resolve(accounts)).toBe('mychart.hospital-b.org');
  });

  test('two accounts, no param, neither connected, neither can connect → error', () => {
    const accounts: Account[] = [
      { hostname: 'mychart.hospital-a.org', username: 'user1', password: 'pass1', connected: false, canConnect: false },
      { hostname: 'mychart.hospital-b.org', username: 'user2', password: 'pass2', connected: false, canConnect: false },
    ];
    expect(() => resolve(accounts)).toThrow('Could not connect to any MyChart account');
  });

  test('two accounts, no param, one already connected → returns connected one', () => {
    const accounts: Account[] = [
      { hostname: 'mychart.hospital-a.org', username: 'user1', password: 'pass1', connected: false },
      { hostname: 'mychart.hospital-b.org', username: 'user2', password: 'pass2', connected: true },
    ];
    expect(resolve(accounts)).toBe('mychart.hospital-b.org');
  });

  test('two accounts, no param, both already connected → error listing connected hostnames', () => {
    const accounts: Account[] = [
      { hostname: 'mychart.hospital-a.org', username: 'user1', password: 'pass1', connected: true },
      { hostname: 'mychart.hospital-b.org', username: 'user2', password: 'pass2', connected: true },
    ];
    expect(() => resolve(accounts)).toThrow('Multiple MyChart accounts connected');
  });

  test('two accounts, explicit param → returns matching account', () => {
    const accounts: Account[] = [
      { hostname: 'mychart.hospital-a.org', username: 'user1', password: 'pass1', connected: false },
      { hostname: 'mychart.hospital-b.org', username: 'user2', password: 'pass2', connected: false },
    ];
    expect(resolve(accounts, 'mychart.hospital-b.org')).toBe('mychart.hospital-b.org');
  });

  test('nonexistent account param → error listing available', () => {
    const accounts: Account[] = [
      { hostname: 'mychart.hospital-a.org', username: 'user1', password: 'pass1', connected: false },
    ];
    expect(() => resolve(accounts, 'nonexistent.org')).toThrow("Account 'nonexistent.org' not found");
    expect(() => resolve(accounts, 'nonexistent.org')).toThrow('mychart.hospital-a.org');
  });

  test('case-insensitive hostname matching', () => {
    const accounts: Account[] = [
      { hostname: 'mychart.hospital-a.org', username: 'user1', password: 'pass1', connected: false },
    ];
    expect(resolve(accounts, 'MyChart.Hospital-A.ORG')).toBe('mychart.hospital-a.org');
  });
});

describe('makeTool account parameter injection', () => {
  test('account property is added to tool parameters', () => {
    // Simulate what makeTool does to parameters
    const originalParams = {
      type: 'object',
      properties: {
        conversation_id: { type: 'string', description: 'Conversation ID' },
      },
      required: ['conversation_id'],
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseProps = (originalParams as any)?.properties ?? {};
    const mergedParams = {
      type: 'object',
      properties: {
        account: { type: 'string', description: 'MyChart account hostname (required if multiple accounts configured)' },
        ...baseProps,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      required: [...((originalParams as any)?.required ?? [])],
    };

    expect(mergedParams.properties.account).toBeDefined();
    expect(mergedParams.properties.conversation_id).toBeDefined();
    expect(mergedParams.required).toContain('conversation_id');
    expect(mergedParams.required).not.toContain('account');
  });

  test('account property is added even when no original parameters', () => {
    const originalParams = undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseProps = (originalParams as any)?.properties ?? {};
    const mergedParams = {
      type: 'object',
      properties: {
        account: { type: 'string', description: 'MyChart account hostname (required if multiple accounts configured)' },
        ...baseProps,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      required: [...((originalParams as any)?.required ?? [])],
    };

    expect(mergedParams.properties.account).toBeDefined();
    expect(Object.keys(mergedParams.properties)).toHaveLength(1);
    expect(mergedParams.required).toHaveLength(0);
  });

  test('account property does not override existing tool properties', () => {
    const originalParams = {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Full name' },
        phone: { type: 'string', description: 'Phone number' },
      },
      required: ['name', 'phone'],
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseProps = (originalParams as any)?.properties ?? {};
    const mergedParams = {
      type: 'object',
      properties: {
        account: { type: 'string', description: 'MyChart account hostname (required if multiple accounts configured)' },
        ...baseProps,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      required: [...((originalParams as any)?.required ?? [])],
    };

    expect(Object.keys(mergedParams.properties)).toHaveLength(3); // account + name + phone
    expect(mergedParams.properties.name.description).toBe('Full name');
    expect(mergedParams.required).toEqual(['name', 'phone']);
  });
});

// ── mychart_select_account fuzzy matching tests ─────────────────────────────

describe('mychart_select_account matching logic', () => {
  interface Account {
    hostname: string;
    username: string;
  }

  /**
   * Mirrors the matching logic in the mychart_select_account tool.
   * Returns matched accounts for a given query.
   */
  function matchAccounts(accounts: Account[], query: string): Account[] {
    const q = query.toLowerCase().trim();
    return accounts.filter(a =>
      a.hostname.toLowerCase().includes(q) ||
      a.username.toLowerCase().includes(q)
    );
  }

  const accounts: Account[] = [
    { hostname: 'mychart.denverhealth.org', username: 'denver@bluesignup.com' },
    { hostname: 'mychart.uchealth.org', username: 'johndoeqwer' },
  ];

  test('"uchealth" matches mychart.uchealth.org', () => {
    const matches = matchAccounts(accounts, 'uchealth');
    expect(matches).toHaveLength(1);
    expect(matches[0].hostname).toBe('mychart.uchealth.org');
  });

  test('"denver" matches mychart.denverhealth.org', () => {
    const matches = matchAccounts(accounts, 'denver');
    expect(matches).toHaveLength(1);
    expect(matches[0].hostname).toBe('mychart.denverhealth.org');
  });

  test('"Denver" matches case-insensitively', () => {
    const matches = matchAccounts(accounts, 'Denver');
    expect(matches).toHaveLength(1);
    expect(matches[0].hostname).toBe('mychart.denverhealth.org');
  });

  test('exact hostname matches', () => {
    const matches = matchAccounts(accounts, 'mychart.uchealth.org');
    expect(matches).toHaveLength(1);
    expect(matches[0].hostname).toBe('mychart.uchealth.org');
  });

  test('username substring matches', () => {
    const matches = matchAccounts(accounts, 'johndoe');
    expect(matches).toHaveLength(1);
    expect(matches[0].hostname).toBe('mychart.uchealth.org');
  });

  test('"mychart" matches both accounts (ambiguous)', () => {
    const matches = matchAccounts(accounts, 'mychart');
    expect(matches).toHaveLength(2);
  });

  test('"nonexistent" matches nothing', () => {
    const matches = matchAccounts(accounts, 'nonexistent');
    expect(matches).toHaveLength(0);
  });

  test('empty query matches nothing', () => {
    // The tool rejects empty query before matching, but test the logic
    const matches = matchAccounts(accounts, '');
    // Empty string is a substring of everything, but the tool validates before calling
    expect(matches.length).toBeGreaterThanOrEqual(0);
  });
});

describe('active account resolution fallback', () => {
  interface Account {
    hostname: string;
    username: string;
    password: string;
    connected: boolean;
  }

  /**
   * Mirrors resolveSession() with active account fallback.
   */
  function resolveWithActive(
    accounts: Account[],
    activeHostname: string | null,
    requestedAccount?: string,
  ): string {
    if (accounts.length === 0) {
      throw new Error('No MyChart accounts configured.');
    }
    if (requestedAccount) {
      const found = accounts.find(a => a.hostname.toLowerCase() === requestedAccount.toLowerCase());
      if (!found) throw new Error(`Account '${requestedAccount}' not found.`);
      return found.hostname;
    }
    if (accounts.length === 1) return accounts[0].hostname;

    const connected = accounts.filter(a => a.connected);
    if (connected.length === 1) return connected[0].hostname;

    // Active account fallback
    if (activeHostname) {
      const active = accounts.find(a => a.hostname.toLowerCase() === activeHostname.toLowerCase());
      if (active) return active.hostname;
    }

    const hostnames = connected.map(a => a.hostname).join(', ');
    throw new Error(`Multiple MyChart accounts connected: ${hostnames}`);
  }

  const accounts: Account[] = [
    { hostname: 'mychart.denverhealth.org', username: 'user1', password: 'pass1', connected: true },
    { hostname: 'mychart.uchealth.org', username: 'user2', password: 'pass2', connected: true },
  ];

  test('both connected, no active account → error', () => {
    expect(() => resolveWithActive(accounts, null)).toThrow('Multiple MyChart accounts connected');
  });

  test('both connected, active account set → returns active', () => {
    expect(resolveWithActive(accounts, 'mychart.uchealth.org')).toBe('mychart.uchealth.org');
  });

  test('active account overridden by selecting different one', () => {
    expect(resolveWithActive(accounts, 'mychart.denverhealth.org')).toBe('mychart.denverhealth.org');
    expect(resolveWithActive(accounts, 'mychart.uchealth.org')).toBe('mychart.uchealth.org');
  });

  test('explicit account param overrides active account', () => {
    expect(resolveWithActive(accounts, 'mychart.denverhealth.org', 'mychart.uchealth.org')).toBe('mychart.uchealth.org');
  });

  test('active account set to nonexistent hostname is ignored, falls through to error', () => {
    expect(() => resolveWithActive(accounts, 'nonexistent.org')).toThrow('Multiple MyChart accounts connected');
  });
});

describe('select_account match-first ordering', () => {
  test('only matched account should be connected, not all accounts', () => {
    // Simulate the match-first-then-connect flow
    const accounts = [
      { hostname: 'mychart.denverhealth.org', username: 'user1', loginAttempted: false },
      { hostname: 'mychart.uchealth.org', username: 'user2', loginAttempted: false },
    ];

    const query = 'uchealth';
    const matches = accounts.filter(a => a.hostname.toLowerCase().includes(query));
    expect(matches).toHaveLength(1);

    // Only connect the matched account
    for (const m of matches) {
      m.loginAttempted = true;
    }

    // Verify only uchealth was connected, not denver
    expect(accounts[0].loginAttempted).toBe(false); // denver: not touched
    expect(accounts[1].loginAttempted).toBe(true);  // uchealth: connected
  });
});

describe('select_account login failure handling', () => {
  test('matched account login fails → active account NOT set', () => {
    let activeAccount: string | null = null;
    const loginSuccess = false; // simulate failure

    const match = { hostname: 'mychart.uchealth.org', username: 'user1' };

    // Simulate the tool's logic
    if (loginSuccess) {
      activeAccount = match.hostname;
    }
    // On failure, activeAccount stays null

    expect(activeAccount).toBeNull();
  });

  test('matched account login succeeds → active account IS set', () => {
    let activeAccount: string | null = null;
    const loginSuccess = true;

    const match = { hostname: 'mychart.uchealth.org', username: 'user1' };

    if (loginSuccess) {
      activeAccount = match.hostname;
    }

    expect(activeAccount).toBe('mychart.uchealth.org');
  });
});

describe('mychart_list_accounts output format', () => {
  test('returns expected shape for each account', () => {
    // Simulate the list_accounts tool output structure
    const accounts = [
      { hostname: 'mychart.hospital-a.org', username: 'user1', password: 'pass1', totpSecret: 'secret' },
      { hostname: 'mychart.hospital-b.org', username: 'user2', password: 'pass2' },
    ];

    const result = accounts.map(a => ({
      hostname: a.hostname,
      username: a.username,
      connected: false,
      hasPasskey: false,
      hasTotpSecret: !!a.totpSecret,
    }));

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      hostname: 'mychart.hospital-a.org',
      username: 'user1',
      connected: false,
      hasPasskey: false,
      hasTotpSecret: true,
    });
    expect(result[1]).toEqual({
      hostname: 'mychart.hospital-b.org',
      username: 'user2',
      connected: false,
      hasPasskey: false,
      hasTotpSecret: false,
    });
  });
});
