import { describe, it, expect, mock, beforeEach } from 'bun:test';

class MockNextRequest {
  url: string;
  headers: Map<string, string>;
  nextUrl: { protocol: string; host: string };
  constructor(url: string) {
    this.url = url;
    this.headers = new Map();
    this.nextUrl = { protocol: 'http:', host: 'localhost:3000' };
  }
}

class MockNextResponse {
  static json(body: unknown, init?: { status?: number }) {
    return { status: init?.status ?? 200, json: async () => body };
  }
}

mock.module('next/server', () => ({
  NextRequest: MockNextRequest,
  NextResponse: MockNextResponse,
}));

const mockRequireAuth = mock(() => Promise.resolve({ id: 'user-1' }));
class AuthError extends Error {
  status: number;
  constructor(msg: string, status: number) { super(msg); this.status = status; }
}
mock.module('@/lib/auth-helpers', () => ({ requireAuth: mockRequireAuth, AuthError }));

const mockGenerateApiKey = mock(() => Promise.resolve('deadbeef'.repeat(8)));
const mockRevokeApiKey = mock(() => Promise.resolve());
const mockHasApiKey = mock(() => Promise.resolve(false));
// Include validateApiKey so any co-running test that mocks this module doesn't lose it
mock.module('@/lib/mcp/api-keys', () => ({
  generateApiKey: mockGenerateApiKey,
  revokeApiKey: mockRevokeApiKey,
  hasApiKey: mockHasApiKey,
  validateApiKey: mock(() => Promise.resolve(null)),
}));

const { GET, POST, DELETE } = await import('../route');

function makeReq() {
  return new MockNextRequest('http://localhost:3000/api/mcp-key');
}

describe('GET /api/mcp-key', () => {
  beforeEach(() => {
    mockRequireAuth.mockClear();
    mockHasApiKey.mockClear();
    mockRequireAuth.mockResolvedValue({ id: 'user-1' });
  });

  it('returns hasKey=false when no key exists', async () => {
    mockHasApiKey.mockResolvedValueOnce(false);
    const res = await GET(makeReq() as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.hasKey).toBe(false);
    expect(mockHasApiKey).toHaveBeenCalledWith('user-1');
  });

  it('returns hasKey=true when key exists', async () => {
    mockHasApiKey.mockResolvedValueOnce(true);
    const res = await GET(makeReq() as never);
    const body = await res.json();
    expect(body.hasKey).toBe(true);
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new AuthError('Unauthorized', 401));
    const res = await GET(makeReq() as never);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/mcp-key', () => {
  beforeEach(() => {
    mockRequireAuth.mockClear();
    mockGenerateApiKey.mockClear();
    mockRequireAuth.mockResolvedValue({ id: 'user-1' });
    mockGenerateApiKey.mockResolvedValue('deadbeef'.repeat(8));
  });

  it('generates a key and returns it with mcpUrl', async () => {
    const res = await POST(makeReq() as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.key).toBe('deadbeef'.repeat(8));
    expect(body.mcpUrl).toContain('/api/mcp?key=');
    expect(body.mcpUrl).toContain(body.key);
    expect(mockGenerateApiKey).toHaveBeenCalledWith('user-1');
  });

  it('builds mcpUrl from NEXT_PUBLIC_BASE_URL env var when set', async () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://app.example.com';
    const res = await POST(makeReq() as never);
    const body = await res.json();
    expect(body.mcpUrl).toStartWith('https://app.example.com/api/mcp?key=');
    delete process.env.NEXT_PUBLIC_BASE_URL;
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new AuthError('Unauthorized', 401));
    const res = await POST(makeReq() as never);
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/mcp-key', () => {
  beforeEach(() => {
    mockRequireAuth.mockClear();
    mockRevokeApiKey.mockClear();
    mockRequireAuth.mockResolvedValue({ id: 'user-1' });
    mockRevokeApiKey.mockResolvedValue(undefined);
  });

  it('revokes the key and returns success', async () => {
    const res = await DELETE(makeReq() as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockRevokeApiKey).toHaveBeenCalledWith('user-1');
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new AuthError('Unauthorized', 401));
    const res = await DELETE(makeReq() as never);
    expect(res.status).toBe(401);
  });
});
