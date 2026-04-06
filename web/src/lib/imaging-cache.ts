import { getSession } from '@/lib/sessions';
import { initEunitySession, type EunitySession } from '../../../scrapers/myChart/eunity/imagingDirectDownload';

/**
 * Cache for eUnity sessions (cookies + series list).
 * The SAML chain + AMF init is expensive (~5s), but once we have
 * the session cookies, individual image downloads are fast.
 * Sessions expire when eUnity times them out (~15-20 min).
 */
const sessionCache = new Map<string, { session: EunitySession; ts: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;
const pendingInits = new Map<string, Promise<EunitySession>>();

function evictStale() {
  const now = Date.now();
  for (const [key, entry] of sessionCache) {
    if (now - entry.ts > CACHE_TTL_MS) sessionCache.delete(key);
  }
}

/**
 * Get or initialize an eUnity session.
 * Caches the session cookies so subsequent image requests skip the SAML chain.
 */
export async function getOrInitSession(
  token: string,
  fdiParam: string,
): Promise<EunitySession> {
  const key = `${token}:${fdiParam}`;

  const cached = sessionCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.session;
  }

  const pending = pendingInits.get(key);
  if (pending) return pending;

  const initPromise = (async (): Promise<EunitySession> => {
    try {
      const mychartRequest = getSession(token);
      if (!mychartRequest) throw new Error('Invalid or expired session');

      const fdiContext = JSON.parse(Buffer.from(fdiParam, 'base64').toString('utf-8'));
      const session = await initEunitySession(mychartRequest, fdiContext);
      if (!session) throw new Error('Failed to initialize eUnity session');

      sessionCache.set(key, { session, ts: Date.now() });
      evictStale();
      return session;
    } finally {
      pendingInits.delete(key);
    }
  })();

  pendingInits.set(key, initPromise);
  return initPromise;
}
