/**
 * MyChart instances that are known to not work and should be blocked
 * from being added by users.
 */
export const BLOCKED_MYCHART_INSTANCES: readonly string[] = [
  'central.mychart.org',
];

/**
 * Check if a hostname is blocked. Compares against the blocklist
 * after normalizing to lowercase.
 */
export function isBlockedInstance(hostname: string): boolean {
  const normalized = hostname.toLowerCase().trim();
  return BLOCKED_MYCHART_INSTANCES.some(
    (blocked) => normalized === blocked || normalized.endsWith('.' + blocked)
  );
}
