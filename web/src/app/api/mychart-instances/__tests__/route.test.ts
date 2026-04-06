import { describe, it, expect, mock, beforeEach } from 'bun:test';

// Mock next/server before anything else
class MockNextRequest {
  url: string;
  headers: Map<string, string>;
  constructor(url: string) {
    this.url = url;
    this.headers = new Map();
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
mock.module('@/lib/auth-helpers', () => ({
  requireAuth: mockRequireAuth,
  AuthError: class AuthError extends Error {
    status: number;
    constructor(msg: string, status: number) {
      super(msg);
      this.status = status;
    }
  },
}));

// Mock DB
const mockGetInstances = mock(() => Promise.resolve([] as unknown[]));
mock.module('@/lib/db', () => ({
  getMyChartInstances: mockGetInstances,
  createMyChartInstance: mock(() => Promise.resolve({})),
  getMyChartInstance: mock(() => Promise.resolve(null)),
  updateMyChartInstance: mock(() => Promise.resolve(null)),
  deleteMyChartInstance: mock(() => Promise.resolve(false)),
  getNotificationEnabledInstances: mock(() => Promise.resolve([])),
  updateNotificationLastChecked: mock(() => Promise.resolve()),
  getUserNotificationPreferences: mock(() => Promise.resolve({ enabled: false, includeContent: false })),
  setUserNotificationPreferences: mock(() => Promise.resolve()),
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
mock.module('@/lib/sessions', () => ({
  getSession: mock(() => undefined),
  setSession: mock(() => {}),
  deleteSession: mock(() => {}),
  getSessionMetadata: mock(() => undefined),
  randomToken: mock(() => 'mock-token'),
  sessionStore: mockSessionStore,
  SESSION_COOKIE_NAME: 'session_token',
  SESSION_COOKIE_MAX_AGE: 86400,
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

const { GET } = await import('../route');

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
    enabled: true,
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

  it('includes enabled field in response', async () => {
    const inst = makeInstance({ enabled: true });
    mockGetInstances.mockResolvedValueOnce([inst]);

    const res = await GET(makeRequest() as never);
    const body = await res.json();

    expect(body[0].enabled).toBe(true);
  });

  it('does not auto-connect disabled instances even with TOTP', async () => {
    const inst = makeInstance({ totpSecret: 'ABCDEF', enabled: false });
    mockGetInstances.mockResolvedValueOnce([inst]);

    const res = await GET(makeRequest() as never);
    const body = await res.json();

    expect(mockAutoConnect).not.toHaveBeenCalled();
    expect(body[0].connected).toBe(false);
    expect(body[0].enabled).toBe(false);
  });

  it('returns both enabled and disabled instances', async () => {
    const enabled = makeInstance({ id: 'inst-1', enabled: true });
    const disabled = makeInstance({ id: 'inst-2', hostname: 'other.com', enabled: false });
    mockGetInstances.mockResolvedValueOnce([enabled, disabled]);

    const res = await GET(makeRequest() as never);
    const body = await res.json();

    expect(body).toHaveLength(2);
    expect(body[0].enabled).toBe(true);
    expect(body[1].enabled).toBe(false);
  });
});
