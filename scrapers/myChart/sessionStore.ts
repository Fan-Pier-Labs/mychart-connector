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
  status: 'logged_in' | 'need_2fa' | 'expired' | 'error';
  createdAt: Date;
}

const KEEPALIVE_MAX_ERRORS = 3;

class SessionStore {
  private sessions = new Map<string, SessionEntry>();
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private keepAliveCounter = 0;
  private keepAliveErrors = new Map<string, number>();

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
    this.keepAliveErrors.delete(token);
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
    const allSessions = Array.from(this.sessions.entries());
    const statusSummary = allSessions.map(([, e]) => `${e.hostname}:${e.status}`).join(', ');
    console.log(`[keepalive] Cycle start | total=${this.sessions.size} active=${activeSessions.length} | ${statusSummary || 'none'}`);

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
    const host = entry.hostname;
    this.keepAliveCounter++;
    const cnt = this.keepAliveCounter;
    const sessionAge = Math.round((Date.now() - entry.createdAt.getTime()) / 1000);
    try {
      const infoBefore = entry.request.getCookieInfo();
      console.log(`[keepalive] ${label} (${host}): ping #${cnt} | age=${sessionAge}s cookies=${infoBefore.count} [${infoBefore.names.join(', ')}]`);

      const start = Date.now();
      const [dotNetResp, aspResp] = await Promise.all([
        entry.request.makeRequest({
          path: `/Home/KeepAlive?cnt=${cnt}`,
          followRedirects: false,
        }),
        entry.request.makeRequest({
          path: `/keepalive.asp?cnt=${cnt}`,
          followRedirects: false,
        }),
      ]);
      const elapsed = Date.now() - start;

      const dotNetBody = await dotNetResp.text();
      const aspBody = await aspResp.text();
      const dotNetStatus = dotNetResp.status;
      const aspStatus = aspResp.status;
      const dotNetLocation = dotNetResp.headers.get('Location') ?? '';
      const aspLocation = aspResp.headers.get('Location') ?? '';

      console.log(
        `[keepalive] ${label} (${host}): response in ${elapsed}ms | ` +
        `KeepAlive: status=${dotNetStatus} body="${dotNetBody.trim().slice(0, 50)}" location="${dotNetLocation}" | ` +
        `keepalive.asp: status=${aspStatus} body="${aspBody.trim().slice(0, 50)}" location="${aspLocation}"`
      );

      // "0" means session explicitly expired.
      // Only trust /Home/KeepAlive — keepalive.asp returns "0" on many modern MyChart
      // instances even when the session is alive (endpoint may not exist → 404/empty).
      // If keepalive.asp also returns "0" we log it, but it doesn't drive expiry alone.
      if (dotNetBody.trim() === '0') {
        console.warn(`[keepalive] ${label} (${host}): EXPIRED — /Home/KeepAlive returned "0" (keepalive.asp=${aspBody.trim()})`);
        entry.status = 'expired';
        return;
      }
      if (aspBody.trim() === '0') {
        console.warn(`[keepalive] ${label} (${host}): keepalive.asp returned "0" but /Home/KeepAlive returned "${dotNetBody.trim()}" — treating as alive`);
      }

      if (dotNetStatus === 200 || aspStatus === 200) {
        this.keepAliveErrors.delete(token);
        const infoAfter = entry.request.getCookieInfo();
        console.log(`[keepalive] ${label} (${host}): ALIVE | cookies: ${infoBefore.count} -> ${infoAfter.count}`);
        return;
      }

      // Neither endpoint returned 200 — likely a redirect to login page
      console.warn(
        `[keepalive] ${label} (${host}): EXPIRED — neither endpoint returned 200 | ` +
        `KeepAlive: ${dotNetStatus} -> "${dotNetLocation}" | keepalive.asp: ${aspStatus} -> "${aspLocation}"`
      );
      entry.status = 'expired';
    } catch (err) {
      const errorCount = (this.keepAliveErrors.get(token) ?? 0) + 1;
      this.keepAliveErrors.set(token, errorCount);
      const errMsg = (err as Error).message;
      const errStack = (err as Error).stack ?? '';
      console.error(
        `[keepalive] ${label} (${host}): network error (${errorCount}/${KEEPALIVE_MAX_ERRORS}) — ${errMsg}\n` +
        errStack.split('\n').slice(0, 3).join('\n')
      );
      if (errorCount >= KEEPALIVE_MAX_ERRORS) {
        console.error(`[keepalive] ${label} (${host}): marking as ERROR after ${KEEPALIVE_MAX_ERRORS} consecutive failures`);
        entry.status = 'error';
        this.keepAliveErrors.delete(token);
      }
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
