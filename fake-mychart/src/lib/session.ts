import { v4 as uuidv4 } from 'uuid';

type Session = {
  createdAt: number;
  lastAccess: number;
  termsAccepted: boolean;
  username: string | null;
};

// In-memory session store. Sessions expire after 30 minutes of inactivity.
const sessions = new Map<string, Session>();

const SESSION_COOKIE_NAME = 'MyChartSession';
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function createSession(username: string | null = null): string {
  const id = uuidv4();
  const now = Date.now();
  sessions.set(id, { createdAt: now, lastAccess: now, termsAccepted: false, username });
  return id;
}

function getSessionId(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

export function validateSession(cookieHeader: string | null): boolean {
  const id = getSessionId(cookieHeader);
  if (!id) return false;
  const session = sessions.get(id);
  if (!session) return false;
  if (Date.now() - session.lastAccess > SESSION_TTL_MS) {
    sessions.delete(id);
    return false;
  }
  session.lastAccess = Date.now();
  return true;
}

export function getSessionUsername(cookieHeader: string | null): string | null {
  const id = getSessionId(cookieHeader);
  if (!id) return null;
  return sessions.get(id)?.username ?? null;
}

export function sessionCookieHeader(sessionId: string): string {
  return `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly`;
}

export function hasAcceptedTerms(cookieHeader: string | null): boolean {
  const id = getSessionId(cookieHeader);
  if (!id) return false;
  return sessions.get(id)?.termsAccepted ?? false;
}

export function acceptTerms(cookieHeader: string | null): boolean {
  const id = getSessionId(cookieHeader);
  if (!id) return false;
  const session = sessions.get(id);
  if (!session) return false;
  session.termsAccepted = true;
  return true;
}

/** Delete all sessions. Used by integration tests to simulate session expiry. */
export function deleteAllSessions(): number {
  const count = sessions.size;
  sessions.clear();
  return count;
}

/** Alias used by /reset to clear all sessions as part of full state reset. */
export function resetSessions(): number {
  return deleteAllSessions();
}

export { SESSION_COOKIE_NAME };
