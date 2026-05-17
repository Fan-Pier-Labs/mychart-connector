/**
 * MyChart instance catalog — sourced from scrapers/list-all-mycharts/mychart-instances.json.
 *
 * Inlined into the bundle at build time by tsup (via `resolveJsonModule`).
 * Provides search + hostname extraction so the setup wizard can offer an
 * autocomplete-style picker without dumping 1300+ entries into a flat dropdown.
 */

import rawInstances from '../../scrapers/list-all-mycharts/mychart-instances.json';

export interface Instance {
  /** Display name, e.g. "UCHealth" */
  name: string;
  /** MyChart login URL */
  url: string;
  /** S3 logo URL (or empty string if unavailable) */
  logoUrl: string;
  /** Cached hostname extracted from the URL */
  hostname: string;
}

const all: Instance[] = (rawInstances as Array<{ name: string; url: string; logoS3Url?: string; logoUrl?: string }>).map(raw => {
  let hostname = '';
  try { hostname = new URL(raw.url).hostname.toLowerCase(); } catch { /* keep empty */ }
  return {
    name: raw.name,
    url: raw.url,
    logoUrl: raw.logoS3Url || raw.logoUrl || '',
    hostname,
  };
}).filter(i => i.hostname);

export function allInstances(): Instance[] {
  return all;
}

/**
 * Case-insensitive substring search across the display name. Returns up
 * to `limit` matches sorted by:
 *   1. Exact (case-insensitive) name match first
 *   2. Name startsWith match
 *   3. Substring match in name
 *   4. Substring match in hostname
 */
export function searchInstances(query: string, limit = 25): Instance[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const exact: Instance[] = [];
  const startsWith: Instance[] = [];
  const nameIncludes: Instance[] = [];
  const hostnameIncludes: Instance[] = [];

  for (const inst of all) {
    const name = inst.name.toLowerCase();
    if (name === q) exact.push(inst);
    else if (name.startsWith(q)) startsWith.push(inst);
    else if (name.includes(q)) nameIncludes.push(inst);
    else if (inst.hostname.includes(q)) hostnameIncludes.push(inst);
  }

  return [...exact, ...startsWith, ...nameIncludes, ...hostnameIncludes].slice(0, limit);
}

/** Look up by exact hostname (case-insensitive). Returns undefined if not in catalog. */
export function findByHostname(hostname: string): Instance | undefined {
  const h = hostname.trim().toLowerCase();
  return all.find(i => i.hostname === h);
}
