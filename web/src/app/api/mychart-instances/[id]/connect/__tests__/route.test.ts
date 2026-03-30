import { describe, it, expect, mock, beforeEach } from 'bun:test';

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

const mockGetInstance = mock(() => Promise.resolve(null as unknown));
mock.module('@/lib/db', () => ({ getMyChartInstance: mockGetInstance }));

const mockGetMyChartSession = mock((_key: string) => undefined as unknown);
mock.module('@/lib/sessions', () => ({ getSession: mockGetMyChartSession }));

const mockAutoConnect = mock(() => Promise.resolve({ state: 'logged_in' as const }));
mock.module('@/lib/mcp/auto-connect', () => ({ autoConnectInstance: mockAutoConnect }));

const { POST } = await import('../route');

const PARAMS = { params: Promise.resolve({ id: 'inst-1' }) };

function makeReq() {
  return new MockNextRequest('http://localhost:3000/api/mychart-instances/inst-1/connect');
}

function makeInstance(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inst-1', userId: 'user-1', hostname: 'mychart.example.com',
    username: 'testuser', password: 'testpass', totpSecret: null,
    mychartEmail: null, createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

describe('POST /api/mychart-instances/[id]/connect', () => {
  beforeEach(() => {
    mockRequireAuth.mockClear();
    mockGetInstance.mockClear();
    mockGetMyChartSession.mockClear();
    mockAutoConnect.mockClear();
    mockRequireAuth.mockResolvedValue({ id: 'user-1' });
  });

  it('returns 404 when instance not found', async () => {
    mockGetInstance.mockResolvedValueOnce(null);
    const res = await POST(makeReq() as never, PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns logged_in immediately if session already exists', async () => {
    mockGetInstance.mockResolvedValueOnce(makeInstance());
    mockGetMyChartSession.mockReturnValue({} as never);
    const res = await POST(makeReq() as never, PARAMS);
    const body = await res.json();
    expect(body.state).toBe('logged_in');
    expect(mockAutoConnect).not.toHaveBeenCalled();
  });

  it('calls auto-connect and returns logged_in on success', async () => {
    mockGetInstance.mockResolvedValueOnce(makeInstance({ totpSecret: 'SECRET' }));
    mockGetMyChartSession.mockReturnValue(undefined);
    mockAutoConnect.mockResolvedValueOnce({ state: 'logged_in' });
    const res = await POST(makeReq() as never, PARAMS);
    const body = await res.json();
    expect(body.state).toBe('logged_in');
    expect(mockAutoConnect).toHaveBeenCalledWith('user-1', expect.objectContaining({ id: 'inst-1' }));
  });

  it('returns need_2fa state with twoFaDelivery', async () => {
    mockGetInstance.mockResolvedValueOnce(makeInstance());
    mockGetMyChartSession.mockReturnValue(undefined);
    mockAutoConnect.mockResolvedValueOnce({ state: 'need_2fa', twoFaDelivery: 'email' });
    const res = await POST(makeReq() as never, PARAMS);
    const body = await res.json();
    expect(body.state).toBe('need_2fa');
    expect(body.twoFaDelivery).toBe('email');
  });

  it('returns error state (200) when auto-connect fails with error', async () => {
    mockGetInstance.mockResolvedValueOnce(makeInstance());
    mockGetMyChartSession.mockReturnValue(undefined);
    mockAutoConnect.mockResolvedValueOnce({ state: 'error' });
    const res = await POST(makeReq() as never, PARAMS);
    const body = await res.json();
    expect(body.state).toBe('error');
    expect(body.error).toMatch(/Login failed/);
  });

  it('returns 500 when auto-connect throws', async () => {
    mockGetInstance.mockResolvedValueOnce(makeInstance());
    mockGetMyChartSession.mockReturnValue(undefined);
    mockAutoConnect.mockRejectedValueOnce(new Error('network timeout'));
    const res = await POST(makeReq() as never, PARAMS);
    expect(res.status).toBe(500);
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new AuthError('Unauthorized', 401));
    const res = await POST(makeReq() as never, PARAMS);
    expect(res.status).toBe(401);
  });
});
