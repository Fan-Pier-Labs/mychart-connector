import { describe, it, expect, mock, beforeEach } from 'bun:test';

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
const mockUpdateInstance = mock(() => Promise.resolve(null as unknown));
const mockDeleteInstance = mock(() => Promise.resolve(false));
mock.module('@/lib/db', () => ({
  getMyChartInstance: mockGetInstance,
  updateMyChartInstance: mockUpdateInstance,
  deleteMyChartInstance: mockDeleteInstance,
}));

const mockGetSession = mock((_key: string) => undefined as unknown);
const mockDeleteSession = mock((_key: string) => {});
mock.module('@/lib/sessions', () => ({
  getSession: mockGetSession,
  deleteSession: mockDeleteSession,
}));

mock.module('@/lib/utils', () => ({ normalizeHostname: (h: string) => h }));

const { GET, PATCH, DELETE } = await import('../route');

function makeReq(body?: unknown) {
  return new MockNextRequest('http://localhost:3000/api/mychart-instances/inst-1', body);
}

const PARAMS = { params: Promise.resolve({ id: 'inst-1' }) };

function makeInstance(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inst-1', userId: 'user-1', hostname: 'mychart.example.com',
    username: 'testuser', password: 'testpass', totpSecret: null,
    mychartEmail: null, createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('GET /api/mychart-instances/[id]', () => {
  beforeEach(() => {
    mockRequireAuth.mockClear();
    mockGetInstance.mockClear();
    mockGetSession.mockClear();
    mockRequireAuth.mockResolvedValue({ id: 'user-1' });
  });

  it('returns 404 when instance not found', async () => {
    mockGetInstance.mockResolvedValueOnce(null);
    const res = await GET(makeReq() as never, PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns instance with connected=false when no session', async () => {
    mockGetInstance.mockResolvedValueOnce(makeInstance());
    mockGetSession.mockReturnValue(undefined);
    const res = await GET(makeReq() as never, PARAMS);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.id).toBe('inst-1');
    expect(body.connected).toBe(false);
    expect(body.hasTotpSecret).toBe(false);
    expect(body).not.toHaveProperty('password');
  });

  it('returns connected=true when session exists', async () => {
    mockGetInstance.mockResolvedValueOnce(makeInstance());
    mockGetSession.mockReturnValue({} as never);
    const res = await GET(makeReq() as never, PARAMS);
    const body = await res.json();
    expect(body.connected).toBe(true);
  });

  it('reflects hasTotpSecret correctly', async () => {
    mockGetInstance.mockResolvedValueOnce(makeInstance({ totpSecret: 'SECRET' }));
    const res = await GET(makeReq() as never, PARAMS);
    const body = await res.json();
    expect(body.hasTotpSecret).toBe(true);
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new AuthError('Unauthorized', 401));
    const res = await GET(makeReq() as never, PARAMS);
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/mychart-instances/[id]', () => {
  beforeEach(() => {
    mockRequireAuth.mockClear();
    mockUpdateInstance.mockClear();
    mockRequireAuth.mockResolvedValue({ id: 'user-1' });
  });

  it('updates and returns the instance', async () => {
    mockUpdateInstance.mockResolvedValueOnce(makeInstance({ username: 'homer_updated' }));
    const res = await PATCH(makeReq({ username: 'homer_updated' }) as never, PARAMS);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.username).toBe('homer_updated');
    expect(body).not.toHaveProperty('password');
    expect(mockUpdateInstance).toHaveBeenCalledWith('inst-1', 'user-1', { username: 'homer_updated' });
  });

  it('returns 404 when instance not found', async () => {
    mockUpdateInstance.mockResolvedValueOnce(null);
    const res = await PATCH(makeReq({ username: 'x' }) as never, PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new AuthError('Unauthorized', 401));
    const res = await PATCH(makeReq({ username: 'x' }) as never, PARAMS);
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/mychart-instances/[id]', () => {
  beforeEach(() => {
    mockRequireAuth.mockClear();
    mockDeleteInstance.mockClear();
    mockDeleteSession.mockClear();
    mockRequireAuth.mockResolvedValue({ id: 'user-1' });
  });

  it('deletes instance and clears session', async () => {
    mockDeleteInstance.mockResolvedValueOnce(true);
    const res = await DELETE(makeReq() as never, PARAMS);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockDeleteSession).toHaveBeenCalledWith('user-1:inst-1');
    expect(mockDeleteInstance).toHaveBeenCalledWith('inst-1', 'user-1');
  });

  it('returns 404 when instance not found', async () => {
    mockDeleteInstance.mockResolvedValueOnce(false);
    const res = await DELETE(makeReq() as never, PARAMS);
    expect(res.status).toBe(404);
  });

  it('clears session even if instance not found', async () => {
    mockDeleteInstance.mockResolvedValueOnce(false);
    await DELETE(makeReq() as never, PARAMS);
    expect(mockDeleteSession).toHaveBeenCalledWith('user-1:inst-1');
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValueOnce(new AuthError('Unauthorized', 401));
    const res = await DELETE(makeReq() as never, PARAMS);
    expect(res.status).toBe(401);
  });
});
