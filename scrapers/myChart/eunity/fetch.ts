import * as tough from 'tough-cookie';

// Use expo/fetch when running inside an Expo app — its Swift-side
// URLSessionDelegate honors redirect:"manual". Under Node/Bun the
// require throws and we fall back to globalThis.fetch.
let impl: typeof globalThis.fetch = globalThis.fetch;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const m = require('expo/fetch') as { fetch?: typeof globalThis.fetch };
  if (m?.fetch) impl = m.fetch;
} catch { /* not in Expo */ }

export { impl as fetch };

// AbortSignal.timeout polyfill for React Native / Hermes.
export function abortAfter(ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof (AbortSignal as unknown as { timeout?: unknown }).timeout === 'function') {
    return (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout(ms);
  }
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
}

export async function fetchWithCookies(
  jar: tough.CookieJar,
  url: string,
  opts: RequestInit & { headers?: Record<string, string> } = {},
): Promise<Response> {
  const cookies = await jar.getCookies(url);
  const cookieHeader = cookies.map(c => `${c.key}=${c.value}`).join('; ');
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string> ?? {}) };
  if (cookieHeader) headers['Cookie'] = cookieHeader;
  const response = await impl(url, { ...opts, headers });
  const setCookies = response.headers.getSetCookie?.() ?? [];
  for (const sc of setCookies) {
    try { await jar.setCookie(sc, url); } catch { /* ignore invalid cookies */ }
  }
  return response;
}
