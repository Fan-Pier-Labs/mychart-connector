import { describe, it, expect, mock, beforeEach } from 'bun:test';

// Mock next/server before anything else
class MockNextRequest {
  url: string;
  headers: Map<string, string>;
  _body: unknown;
  constructor(url: string, body?: unknown) {
    this.url = url;
    this.headers = new Map();
    this._body = body;
  }
  json() {
    return Promise.resolve(this._body);
  }
}

class MockNextResponse {
  static json(body: unknown, init?: { status?: number }) {
    return {
      status: init?.status ?? 200,
      json: async () => body,
    };
  }
}

mock.module('next/server', () => ({
  NextRequest: MockNextRequest,
  NextResponse: MockNextResponse,
}));

// Mock auth
const mockRequireAuth = mock(() => Promise.resolve({ id: 'user-1' }));
class AuthError extends Error {
  status: number;
  constructor(msg: string, status: number) { super(msg); this.status = status; }
}
mock.module('@/lib/auth-helpers', () => ({ requireAuth: mockRequireAuth, AuthError }));

// Mock DB — include all exports needed by this file and any [id]/* routes in the same test run
const mockGetInstances = mock(() => Promise.resolve([] as unknown[]));
const mockCreateInstance = mock(() => Promise.resolve(makeInstance()));
mock.module('@/lib/db', () => ({
  getMyChartInstances: mockGetInstances,
  createMyChartInstance: mockCreateInstance,
  getMyChartInstance: mock(() => Promise.resolve(null)),
  updateMyChartInstance: mock(() => Promise.resolve(null)),
  deleteMyChartInstance: mock(() => Promise.resolve(false)),
}));

// Mock sessionStore (via @/lib/sessions which re-exports it)
const entryStore = new Map<string, { status: string; request: object }>();
const mockSessionStore = {
  getEntry: (key: string) => entryStore.get(key),
  get: (key: string) => entryStore.get(key)?.request,
  set: mock(() => {}),
  delete: mock(() => {}),
};
mock.module('../../../../../scrapers/myChart/sessionStore', () => ({
  sessionStore: mockSessionStore,
}));
// Include all @/lib/sessions exports needed by this and child route test files
mock.module('@/lib/sessions', () => ({
  sessionStore: mockSessionStore,
  getSession: (key: string) => mockSessionStore.get(key),
  deleteSession: mock((_key: string) => {}),
  setSession: mock(() => {}),
}));

// Mock auto-connect
const mockAutoConnect = mock(() => Promise.resolve({ state: 'logged_in' as const }));
mock.module('@/lib/mcp/auto-connect', () => ({
  autoConnectInstance: mockAutoConnect,
}));

// Mock utils
mock.module('@/lib/utils', () => ({
  normalizeHostname: (h: string) => h,
}));

const { GET, POST } = await import('../route');

function makeRequest() {
  return new MockNextRequest('http://localhost:3000/api/mychart-instances');
}

function makeInstance(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inst-1',
    userId: 'user-1',
    hostname: 'mychart.example.com',
    username: 'testuser',
    password: 'testpass',
    totpSecret: null,
    mychartEmail: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('GET /api/mychart-instances', () => {
  beforeEach(() => {
    mockRequireAuth.mockClear();
    mockGetInstances.mockClear();
    mockAutoConnect.mockClear();
    entryStore.clear();
    mockRequireAuth.mockResolvedValue({ id: 'user-1' });
  });

  it('auto-connects TOTP-enabled instances that are not logged in', async () => {
    const inst = makeInstance({ totpSecret: 'ABCDEF' });
    mockGetInstances.mockResolvedValueOnce([inst]);
    mockAutoConnect.mockImplementationOnce(async () => {
      entryStore.set('user-1:inst-1', { status: 'logged_in', request: {} });
      return { state: 'logged_in' };
    });

    const res = await GET(makeRequest() as never);
    const body = await res.json();

    expect(mockAutoConnect).toHaveBeenCalledWith('user-1', inst);
    expect(body).toHaveLength(1);
    expect(body[0].connected).toBe(true);
    expect(body[0].hasTotpSecret).toBe(true);
  });

  it('skips auto-connect for instances without TOTP', async () => {
    const inst = makeInstance({ totpSecret: null });
    mockGetInstances.mockResolvedValueOnce([inst]);

    const res = await GET(makeRequest() as never);
    const body = await res.json();

    expect(mockAutoConnect).not.toHaveBeenCalled();
    expect(body[0].connected).toBe(false);
  });

  it('skips auto-connect for already logged-in instances', async () => {
    const inst = makeInstance({ totpSecret: 'ABCDEF' });
    mockGetInstances.mockResolvedValueOnce([inst]);
    entryStore.set('user-1:inst-1', { status: 'logged_in', request: {} });

    const res = await GET(makeRequest() as never);
    const body = await res.json();

    expect(mockAutoConnect).not.toHaveBeenCalled();
    expect(body[0].connected).toBe(true);
  });

  it('reports connected=false when auto-connect fails', async () => {
    const inst = makeInstance({ totpSecret: 'ABCDEF' });
    mockGetInstances.mockResolvedValueOnce([inst]);
    mockAutoConnect.mockResolvedValueOnce({ state: 'error' });

    const res = await GET(makeRequest() as never);
    const body = await res.json();

    expect(mockAutoConnect).toHaveBeenCalled();
    expect(body[0].connected).toBe(false);
  });

  it('does not crash if auto-connect throws', async () => {
    const inst = makeInstance({ totpSecret: 'ABCDEF' });
    mockGetInstances.mockResolvedValueOnce([inst]);
    mockAutoConnect.mockRejectedValueOnce(new Error('network error'));

    const res = await GET(makeRequest() as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body[0].connected).toBe(false);
  });

  it('only reports connected=true for logged_in status', async () => {
    const inst = makeInstance({ totpSecret: null });
    mockGetInstances.mockResolvedValueOnce([inst]);
    entryStore.set('user-1:inst-1', { status: 'need_2fa', request: {} });

    const res = await GET(makeRequest() as never);
    const body = await res.json();

    expect(body[0].connected).toBe(false);
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new AuthError('Unauthorized', 401));
    const res = await GET(makeRequest() as never);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/mychart-instances', () => {
  beforeEach(() => {
    mockRequireAuth.mockClear();
    mockCreateInstance.mockClear();
    mockRequireAuth.mockResolvedValue({ id: 'user-1' });
    mockCreateInstance.mockResolvedValue(makeInstance());
  });

  function makePostRequest(body: unknown) {
    return new MockNextRequest('http://localhost:3000/api/mychart-instances', body);
  }

  it('creates and returns an instance with 201', async () => {
    const res = await POST(makePostRequest({
      hostname: 'mychart.example.com',
      username: 'testuser',
      password: 'testpass',
    }) as never);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.hostname).toBe('mychart.example.com');
    expect(body.username).toBe('testuser');
    expect(body.connected).toBe(false);
    expect(body).not.toHaveProperty('password');
    expect(mockCreateInstance).toHaveBeenCalledWith('user-1', expect.objectContaining({
      hostname: 'mychart.example.com',
      username: 'testuser',
      password: 'testpass',
    }));
  });

  it('stores optional totpSecret and mychartEmail', async () => {
    mockCreateInstance.mockResolvedValueOnce(makeInstance({ totpSecret: 'SECRET', mychartEmail: 'homer@example.com' }));
    const res = await POST(makePostRequest({
      hostname: 'mychart.example.com',
      username: 'testuser',
      password: 'testpass',
      totpSecret: 'SECRET',
      mychartEmail: 'homer@example.com',
    }) as never);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.hasTotpSecret).toBe(true);
    expect(body.mychartEmail).toBe('homer@example.com');
  });

  it('returns 400 when hostname is missing', async () => {
    const res = await POST(makePostRequest({ username: 'u', password: 'p' }) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/hostname/);
  });

  it('returns 400 when username is missing', async () => {
    const res = await POST(makePostRequest({ hostname: 'h', password: 'p' }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await POST(makePostRequest({ hostname: 'h', username: 'u' }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 409 on duplicate account', async () => {
    mockCreateInstance.mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505' }));
    const res = await POST(makePostRequest({
      hostname: 'mychart.example.com',
      username: 'testuser',
      password: 'testpass',
    }) as never);
    expect(res.status).toBe(409);
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new AuthError('Unauthorized', 401));
    const res = await POST(makePostRequest({ hostname: 'h', username: 'u', password: 'p' }) as never);
    expect(res.status).toBe(401);
  });
});
