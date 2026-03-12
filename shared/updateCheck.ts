/**
 * Non-blocking update checker that compares the local version against the
 * latest GitHub release. Fire-and-forget — never throws or blocks the caller.
 */

const GITHUB_RELEASES_URL =
  'https://api.github.com/repos/Fan-Pier-Labs/mychart-connector/releases/latest';

/** Compare two semver strings. Returns -1 if a < b, 0 if equal, 1 if a > b. */
export function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

export interface UpdateCheckResult {
  latestVersion: string;
  updateAvailable: boolean;
}

export async function checkForUpdate(opts: {
  currentVersion: string;
  packageName: string;
  logger?: { warn: (msg: string) => void };
}): Promise<UpdateCheckResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(GITHUB_RELEASES_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = (await res.json()) as { tag_name?: string };
    if (!data.tag_name) return null;

    const latestVersion = data.tag_name.replace(/^v/, '');
    const updateAvailable = compareSemver(opts.currentVersion, latestVersion) < 0;

    if (updateAvailable) {
      const msg = `\n  Update available: v${opts.currentVersion} → v${latestVersion} — https://github.com/Fan-Pier-Labs/mychart-connector/releases/latest\n`;
      if (opts.logger) {
        opts.logger.warn(msg);
      } else {
        console.warn(msg);
      }
    }

    return { latestVersion, updateAvailable };
  } catch {
    return null;
  }
}
