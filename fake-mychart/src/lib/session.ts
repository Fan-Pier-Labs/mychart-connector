import { v4 as uuidv4 } from 'uuid';

// In-memory session store. Sessions expire after 30 minutes of inactivity.
const sessions = new Map<string, { createdAt: number; lastAccess: number; termsAccepted: boolean }>();

const SESSION_COOKIE_NAME = 'MyChartSession';
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function createSession(): string {
  const id = uuidv4();
  const now = Date.now();
  sessions.set(id, { createdAt: now, lastAccess: now, termsAccepted: false });
  return id;
}

export function validateSession(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  const id = match[1];
  const session = sessions.get(id);
  if (!session) return false;
  if (Date.now() - session.lastAccess > SESSION_TTL_MS) {
    sessions.delete(id);
    return false;
  }
  session.lastAccess = Date.now();
  return true;
}

export function sessionCookieHeader(sessionId: string): string {
  return `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly`;
}

export function hasAcceptedTerms(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  const session = sessions.get(match[1]);
  return session?.termsAccepted ?? false;
}

export function acceptTerms(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  const session = sessions.get(match[1]);
  if (!session) return false;
  session.termsAccepted = true;
  return true;
}

export { SESSION_COOKIE_NAME };
