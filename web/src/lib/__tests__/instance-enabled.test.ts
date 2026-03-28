import { describe, it, expect, mock, beforeEach } from 'bun:test';

// Mock next/server before anything else
class MockNextRequest {
  url: string;
  headers: Map<string, string>;
  constructor(url: string) {
    this.url = url;
    this.headers = new Map();
  }
  async json() {
    return {};
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
const mockUpdateInstance = mock(() => Promise.resolve(null as unknown));
mock.module('@/lib/db', () => ({
  getMyChartInstances: mockGetInstances,
  createMyChartInstance: mock(() => Promise.resolve({})),
  getMyChartInstance: mock(() => Promise.resolve(null)),
  updateMyChartInstance: mockUpdateInstance,
  deleteMyChartInstance: mock(() => Promise.resolve(false)),
  getNotificationEnabledInstances: mock(() => Promise.resolve([])),
  updateNotificationLastChecked: mock(() => Promise.resolve()),
  getUserNotificationPreferences: mock(() => Promise.resolve({ enabled: false, includeContent: false })),
  setUserNotificationPreferences: mock(() => Promise.resolve()),
}));

// Mock sessionStore
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
  sessionStore: mockSessionStore,
  getSession: (key: string) => entryStore.get(key)?.request,
  deleteSession: mock(() => {}),
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

// Mock telemetry
mock.module('../../../../../../shared/telemetry', () => ({
  sendTelemetryEvent: () => {},
}));
mock.module('../../../../../shared/telemetry', () => ({
  sendTelemetryEvent: () => {},
}));

const { GET } = await import('../../app/api/mychart-instances/route');

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

describe('Instance enabled/disabled', () => {
  beforeEach(() => {
    mockRequireAuth.mockClear();
    mockGetInstances.mockClear();
    mockAutoConnect.mockClear();
    mockUpdateInstance.mockClear();
    entryStore.clear();
    mockRequireAuth.mockResolvedValue({ id: 'user-1' });
  });

  it('returns enabled field in GET response', async () => {
    const inst = makeInstance({ enabled: true });
    mockGetInstances.mockResolvedValueOnce([inst]);

    const res = await GET(makeRequest() as never);
    const body = await res.json();

    expect(body).toHaveLength(1);
    expect(body[0].enabled).toBe(true);
  });

  it('returns enabled=false for disabled instances', async () => {
    const inst = makeInstance({ enabled: false });
    mockGetInstances.mockResolvedValueOnce([inst]);

    const res = await GET(makeRequest() as never);
    const body = await res.json();

    expect(body).toHaveLength(1);
    expect(body[0].enabled).toBe(false);
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

  it('auto-connects enabled instances with TOTP', async () => {
    const inst = makeInstance({ totpSecret: 'ABCDEF', enabled: true });
    mockGetInstances.mockResolvedValueOnce([inst]);
    mockAutoConnect.mockImplementationOnce(async () => {
      entryStore.set('user-1:inst-1', { status: 'logged_in', request: {} });
      return { state: 'logged_in' };
    });

    const res = await GET(makeRequest() as never);
    const body = await res.json();

    expect(mockAutoConnect).toHaveBeenCalled();
    expect(body[0].connected).toBe(true);
    expect(body[0].enabled).toBe(true);
  });

  it('shows both enabled and disabled instances in the list', async () => {
    const enabled = makeInstance({ id: 'inst-1', enabled: true });
    const disabled = makeInstance({ id: 'inst-2', hostname: 'mychart2.example.com', enabled: false });
    mockGetInstances.mockResolvedValueOnce([enabled, disabled]);

    const res = await GET(makeRequest() as never);
    const body = await res.json();

    expect(body).toHaveLength(2);
    expect(body[0].enabled).toBe(true);
    expect(body[1].enabled).toBe(false);
  });
});
