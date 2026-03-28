import { describe, it, expect } from 'bun:test';
import { isBlockedInstance, BLOCKED_MYCHART_INSTANCES } from '../blockedInstances';

describe('BLOCKED_MYCHART_INSTANCES', () => {
  it('contains central.mychart.org', () => {
    expect(BLOCKED_MYCHART_INSTANCES).toContain('central.mychart.org');
  });
});

describe('isBlockedInstance', () => {
  it('blocks central.mychart.org', () => {
    expect(isBlockedInstance('central.mychart.org')).toBe(true);
  });

  it('blocks with mixed case', () => {
    expect(isBlockedInstance('Central.MyChart.Org')).toBe(true);
  });

  it('blocks with whitespace', () => {
    expect(isBlockedInstance('  central.mychart.org  ')).toBe(true);
  });

  it('allows other mychart instances', () => {
    expect(isBlockedInstance('mychart.example.org')).toBe(false);
    expect(isBlockedInstance('mychart.ochsner.org')).toBe(false);
    expect(isBlockedInstance('mychart.geisinger.org')).toBe(false);
  });

  it('does not block partial matches', () => {
    expect(isBlockedInstance('notcentral.mychart.org')).toBe(false);
  });
});
