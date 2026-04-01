import { describe, it, expect } from 'bun:test';

/**
 * Tests for the disabled-instance filtering logic used in the MCP server's
 * resolveRequest and the GET /api/mychart-instances endpoint.
 *
 * The actual filtering is: `allInstances.filter(i => i.enabled)`
 * We test the logic directly rather than importing the full MCP server,
 * which has heavy dependencies.
 */

interface Instance {
  id: string;
  hostname: string;
  enabled: boolean;
  totpSecret: string | null;
}

function filterEnabled(instances: Instance[]): Instance[] {
  return instances.filter(i => i.enabled);
}

function filterAutoConnectable(instances: Instance[]): Instance[] {
  return instances.filter(i => i.enabled && i.totpSecret);
}

describe('Instance enabled filtering logic', () => {
  const enabledWithTotp: Instance = { id: '1', hostname: 'a.com', enabled: true, totpSecret: 'secret' };
  const enabledNoTotp: Instance = { id: '2', hostname: 'b.com', enabled: true, totpSecret: null };
  const disabledWithTotp: Instance = { id: '3', hostname: 'c.com', enabled: false, totpSecret: 'secret' };
  const disabledNoTotp: Instance = { id: '4', hostname: 'd.com', enabled: false, totpSecret: null };

  it('filters out disabled instances', () => {
    const result = filterEnabled([enabledWithTotp, disabledWithTotp, enabledNoTotp, disabledNoTotp]);
    expect(result).toHaveLength(2);
    expect(result.map(i => i.id)).toEqual(['1', '2']);
  });

  it('returns empty array when all disabled', () => {
    const result = filterEnabled([disabledWithTotp, disabledNoTotp]);
    expect(result).toHaveLength(0);
  });

  it('returns all when all enabled', () => {
    const result = filterEnabled([enabledWithTotp, enabledNoTotp]);
    expect(result).toHaveLength(2);
  });

  it('auto-connect filters out disabled instances even with TOTP', () => {
    const result = filterAutoConnectable([enabledWithTotp, disabledWithTotp, enabledNoTotp]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('auto-connect returns empty when only disabled have TOTP', () => {
    const result = filterAutoConnectable([disabledWithTotp, enabledNoTotp]);
    expect(result).toHaveLength(0);
  });
});
