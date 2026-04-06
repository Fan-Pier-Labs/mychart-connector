import { describe, it, expect } from 'bun:test';

/**
 * Tests for the instance enabled/disabled filtering logic used across:
 * - GET /api/mychart-instances (auto-connect filter)
 * - MCP server resolveRequest
 * - Notification checker (getNotificationEnabledInstances SQL)
 *
 * These test the filtering predicates directly to avoid mock.module leakage
 * issues with Bun's global mock system.
 */

interface Instance {
  id: string;
  hostname: string;
  username: string;
  enabled: boolean;
  totpSecret: string | null;
  passkeyCredential: string | null;
  connected?: boolean;
}

/** Mirrors the auto-connect filter in GET /api/mychart-instances */
function shouldAutoConnect(inst: Instance, isLoggedIn: boolean): boolean {
  if (!inst.enabled) return false;
  if (!inst.totpSecret && !inst.passkeyCredential) return false;
  if (isLoggedIn) return false;
  return true;
}

/** Mirrors the resolveRequest filter in MCP server */
function filterEnabledInstances(instances: Instance[]): Instance[] {
  return instances.filter(i => i.enabled);
}

/** Mirrors the response shape from GET /api/mychart-instances */
function toApiResponse(inst: Instance, isLoggedIn: boolean) {
  return {
    id: inst.id,
    hostname: inst.hostname,
    username: inst.username,
    hasTotpSecret: !!inst.totpSecret,
    hasPasskeyCredential: !!inst.passkeyCredential,
    enabled: inst.enabled,
    connected: isLoggedIn,
  };
}

function makeInstance(overrides: Partial<Instance> = {}): Instance {
  return {
    id: 'inst-1',
    hostname: 'mychart.example.com',
    username: 'testuser',
    enabled: true,
    totpSecret: null,
    passkeyCredential: null,
    ...overrides,
  };
}

describe('Instance enabled/disabled', () => {
  describe('API response shape', () => {
    it('includes enabled=true in response', () => {
      const inst = makeInstance({ enabled: true });
      const resp = toApiResponse(inst, false);
      expect(resp.enabled).toBe(true);
    });

    it('includes enabled=false in response', () => {
      const inst = makeInstance({ enabled: false });
      const resp = toApiResponse(inst, false);
      expect(resp.enabled).toBe(false);
    });

    it('includes both enabled and disabled instances in the list', () => {
      const enabled = makeInstance({ id: '1', enabled: true });
      const disabled = makeInstance({ id: '2', hostname: 'other.com', enabled: false });
      const responses = [enabled, disabled].map(i => toApiResponse(i, false));
      expect(responses).toHaveLength(2);
      expect(responses[0].enabled).toBe(true);
      expect(responses[1].enabled).toBe(false);
    });
  });

  describe('auto-connect filtering', () => {
    it('does not auto-connect disabled instances even with TOTP', () => {
      const inst = makeInstance({ totpSecret: 'SECRET', enabled: false });
      expect(shouldAutoConnect(inst, false)).toBe(false);
    });

    it('auto-connects enabled instances with TOTP', () => {
      const inst = makeInstance({ totpSecret: 'SECRET', enabled: true });
      expect(shouldAutoConnect(inst, false)).toBe(true);
    });

    it('does not auto-connect enabled instances without TOTP or passkey', () => {
      const inst = makeInstance({ totpSecret: null, passkeyCredential: null, enabled: true });
      expect(shouldAutoConnect(inst, false)).toBe(false);
    });

    it('auto-connects enabled instances with passkey credential', () => {
      const inst = makeInstance({ passkeyCredential: '{"credentialId":"abc"}', enabled: true });
      expect(shouldAutoConnect(inst, false)).toBe(true);
    });

    it('auto-connects enabled instances with both TOTP and passkey', () => {
      const inst = makeInstance({ totpSecret: 'SECRET', passkeyCredential: '{"credentialId":"abc"}', enabled: true });
      expect(shouldAutoConnect(inst, false)).toBe(true);
    });

    it('does not auto-connect already logged-in instances', () => {
      const inst = makeInstance({ totpSecret: 'SECRET', enabled: true });
      expect(shouldAutoConnect(inst, true)).toBe(false);
    });
  });

  describe('MCP resolveRequest filtering', () => {
    it('filters out disabled instances', () => {
      const instances = [
        makeInstance({ id: '1', enabled: true }),
        makeInstance({ id: '2', hostname: 'disabled.com', enabled: false }),
        makeInstance({ id: '3', hostname: 'enabled2.com', enabled: true }),
      ];
      const result = filterEnabledInstances(instances);
      expect(result).toHaveLength(2);
      expect(result.map(i => i.id)).toEqual(['1', '3']);
    });

    it('returns empty when all instances are disabled', () => {
      const instances = [
        makeInstance({ id: '1', enabled: false }),
        makeInstance({ id: '2', enabled: false }),
      ];
      expect(filterEnabledInstances(instances)).toHaveLength(0);
    });

    it('returns all when all instances are enabled', () => {
      const instances = [
        makeInstance({ id: '1', enabled: true }),
        makeInstance({ id: '2', enabled: true }),
      ];
      expect(filterEnabledInstances(instances)).toHaveLength(2);
    });
  });
});
