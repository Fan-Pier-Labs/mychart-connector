import { describe, it, expect, mock, beforeEach } from 'bun:test';

// Mock BetterAuth handler responses
const mockGET = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
const mockPOST = mock(() => Promise.resolve(new Response('{}', { status: 200 })));

mock.module('better-auth/next-js', () => ({
  toNextJsHandler: () => ({ GET: mockGET, POST: mockPOST }),
}));

mock.module('@/lib/auth', () => ({
  getAuth: () => Promise.resolve({}),
}));

const { GET, POST } = await import('../[...all]/route');

function makeRequest(method: string, path: string, origin?: string) {
  const headers: Record<string, string> = {};
  if (origin) headers['origin'] = origin;
  return new Request(`http://localhost:3000${path}`, { method, headers });
}

describe('Auth route error handling', () => {
  beforeEach(() => {
    mockGET.mockClear();
    mockPOST.mockClear();
  });

  describe('POST /api/auth/sign-in/social (Google sign-in)', () => {
    it('returns response from handler on success', async () => {
      const redirectResponse = new Response(null, {
        status: 302,
        headers: { location: 'https://accounts.google.com/o/oauth2/v2/auth?...' },
      });
      mockPOST.mockImplementationOnce(() => Promise.resolve(redirectResponse));

      const req = makeRequest('POST', '/api/auth/sign-in/social', 'http://localhost:3000');
      const res = await POST(req);

      expect(res.status).toBe(302);
    });

    it('returns 500 JSON response instead of throwing when handler throws', async () => {
      mockPOST.mockImplementationOnce(() => Promise.reject(new Error('password authentication failed for user "postgres"')));

      const req = makeRequest('POST', '/api/auth/sign-in/social', 'http://localhost:3000');
      const res = await POST(req);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('GET /api/auth/callback/google (OAuth callback)', () => {
    it('returns response from handler on success', async () => {
      mockGET.mockImplementationOnce(() => Promise.resolve(new Response(null, { status: 302 })));

      const req = makeRequest('GET', '/api/auth/callback/google');
      const res = await GET(req);

      expect(res.status).toBe(302);
    });

    it('returns 500 JSON response instead of throwing when handler throws', async () => {
      mockGET.mockImplementationOnce(() => Promise.reject(new Error('DB connection failed')));

      const req = makeRequest('GET', '/api/auth/callback/google');
      const res = await GET(req);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('GET /api/auth/get-session', () => {
    it('returns 500 JSON response when auth initialization fails', async () => {
      mockGET.mockImplementationOnce(() => Promise.reject(new Error('secrets manager timeout')));

      const req = makeRequest('GET', '/api/auth/get-session');
      const res = await GET(req);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Internal server error');
    });
  });
});
