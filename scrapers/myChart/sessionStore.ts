/**
 * Unified in-memory session store and keepalive for MyChart sessions.
 *
 * Used by both the CLI and the web app. Each session is a token -> MyChartRequest
 * mapping. The keepalive calls /Home/KeepAlive and /keepalive.asp every 30s
 * (matching MyChart's own JS) to prevent session expiry.
 *
 * Usage:
 *   import { sessionStore } from './sessionStore';
 *   sessionStore.set('my-token', mychartRequest);
 *   const req = sessionStore.get('my-token');
 *   const stop = sessionStore.startKeepalive();
 *   // ... later
 *   stop();
 */

import { MyChartRequest } from './myChartRequest';

const KEEPALIVE_INTERVAL_MS = 30 * 1000; // 30 seconds, matches MyChart's own JS interval

export interface SessionEntry {
  request: MyChartRequest;
  hostname: string;
  status: 'logged_in' | 'need_2fa' | 'need_terms_acceptance' | 'expired' | 'error';
  createdAt: Date;
}

class SessionStore {
  private sessions = new Map<string, SessionEntry>();
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private keepAliveCounter = 0;

  /** Store a session. */
  set(token: string, request: MyChartRequest, opts?: { hostname?: string; status?: SessionEntry['status'] }) {
    this.sessions.set(token, {
      request,
      hostname: opts?.hostname ?? request.hostname,
      status: opts?.status ?? 'logged_in',
      createdAt: new Date(),
    });
  }

  /** Get the MyChartRequest for a token. Returns undefined if not found. */
  get(token: string): MyChartRequest | undefined {
    return this.sessions.get(token)?.request;
  }

  /** Get the full session entry. */
  getEntry(token: string): SessionEntry | undefined {
    return this.sessions.get(token);
  }

  /** Update session status. */
  setStatus(token: string, status: SessionEntry['status']) {
    const entry = this.sessions.get(token);
    if (entry) entry.status = status;
  }

  /** Delete a session. */
  delete(token: string) {
    this.sessions.delete(token);
  }

  /** Check if a session exists. */
  has(token: string): boolean {
    return this.sessions.has(token);
  }

  /** Get all sessions. */
  all(): Map<string, SessionEntry> {
    return this.sessions;
  }

  /** Get all logged-in sessions. */
  active(): [string, SessionEntry][] {
    return Array.from(this.sessions).filter(([, e]) => e.status === 'logged_in');
  }

  /** Number of sessions. */
  get size(): number {
    return this.sessions.size;
  }

  /**
   * Start the keepalive interval. Pings keepalive endpoints for all active sessions.
   * Returns a stop function to cancel the interval.
   */
  startKeepalive(): () => void {
    if (this.intervalHandle) {
      return () => this.stopKeepalive();
    }
    console.log(`[keepalive] Starting keepalive (every ${KEEPALIVE_INTERVAL_MS / 1000}s)`);
    this.intervalHandle = setInterval(() => this.runKeepalive(), KEEPALIVE_INTERVAL_MS);
    return () => this.stopKeepalive();
  }

  /** Stop the keepalive interval. */
  stopKeepalive() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log('[keepalive] Stopped');
    }
  }

  /** Run a single keepalive cycle. Pings /Home for each active session. */
  async runKeepalive() {
    const activeSessions = this.active();
    console.log(`[keepalive] Checking ${activeSessions.length} active session(s)`);

    for (const [token, entry] of activeSessions) {
      await this.pingSession(token, entry);
    }
  }

  /**
   * Ping a single session using MyChart's actual keepalive endpoints.
   * MyChart's JS calls both /Home/KeepAlive and /keepalive.asp every 30s.
   * Each returns "1" if alive, "0" if expired.
   */
  private async pingSession(token: string, entry: SessionEntry) {
    const label = token.length > 12 ? token.slice(0, 8) + '...' : token;
    this.keepAliveCounter++;
    try {
      const infoBefore = entry.request.getCookieInfo();
      console.log(`[keepalive] ${label}: pinging KeepAlive #${this.keepAliveCounter} (${infoBefore.count} cookies)`);

      // Call both keepalive endpoints like MyChart's own JS does
      const [dotNetResp, aspResp] = await Promise.all([
        entry.request.makeRequest({
          path: `/Home/KeepAlive?cnt=${this.keepAliveCounter}`,
          followRedirects: false,
        }),
        entry.request.makeRequest({
          path: `/keepalive.asp?cnt=${this.keepAliveCounter}`,
          followRedirects: false,
        }),
      ]);

      const dotNetBody = await dotNetResp.text();
      const aspBody = await aspResp.text();

      // "0" means session expired, anything else (usually "1") means alive
      if (dotNetBody.trim() === '0' || aspBody.trim() === '0') {
        console.log(`[keepalive] ${label}: expired (KeepAlive=${dotNetBody.trim()}, keepalive.asp=${aspBody.trim()})`);
        entry.status = 'expired';
        return;
      }

      if (dotNetResp.status === 200 || aspResp.status === 200) {
        const infoAfter = entry.request.getCookieInfo();
        console.log(`[keepalive] ${label}: alive (cookies: ${infoBefore.count} -> ${infoAfter.count})`);
        return;
      }

      const location = dotNetResp.headers.get('Location') || aspResp.headers.get('Location') || '';
      console.log(`[keepalive] ${label}: expired (status=${dotNetResp.status}/${aspResp.status}, Location: ${location})`);
      entry.status = 'expired';
    } catch (err) {
      console.error(`[keepalive] ${label}: error -`, (err as Error).message);
      entry.status = 'error';
    }
  }
}

/**
 * Singleton session store via globalThis.
 * Next.js bundles each API route separately, so a plain module-level singleton
 * creates separate instances per bundle. Using globalThis ensures all bundles
 * (API routes, instrumentation, etc.) share the same SessionStore.
 */
const globalKey = '__mychart_session_store__' as const;
export const sessionStore: SessionStore =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any)[globalKey] ??= new SessionStore();
