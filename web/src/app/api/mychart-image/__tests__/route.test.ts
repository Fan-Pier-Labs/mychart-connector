import { describe, it, expect, mock, beforeEach } from 'bun:test';

// Mock NextRequest/NextResponse
class MockNextRequest {
  nextUrl: URL;
  constructor(url: string) {
    this.nextUrl = new URL(url);
  }
}

let lastResponseBody: unknown;
let lastResponseInit: Record<string, unknown> = {};

class MockNextResponse {
  body: unknown;
  headers: Map<string, string>;
  constructor(body: unknown, init?: { headers?: Record<string, string> }) {
    this.body = body;
    this.headers = new Map(Object.entries(init?.headers || {}));
    lastResponseBody = body;
    lastResponseInit = init || {};
  }
  static json(body: unknown, init?: { status?: number }) {
    return { status: init?.status ?? 200, body, json: async () => body };
  }
}

mock.module('next/server', () => ({
  NextRequest: MockNextRequest,
  NextResponse: MockNextResponse,
}));

// Mock sessions
const mockMychartRequest = {
  protocol: 'https',
  hostname: 'mychart.example.org',
  makeRequest: mock(() => Promise.resolve({
    ok: true,
    status: 200,
    headers: { get: (name: string) => name === 'content-type' ? 'image/png' : null },
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
  })),
};

const mockGetSession = mock((token: string) => token === 'valid' ? mockMychartRequest : undefined);
mock.module('@/lib/sessions', () => ({
  getSession: mockGetSession,
  setSession: mock(() => {}),
  deleteSession: mock(() => {}),
  getSessionMetadata: mock(() => undefined),
  randomToken: mock(() => 'mock-token'),
  sessionStore: {
    getEntry: mock(() => undefined),
    get: mock(() => undefined),
    set: mock(() => {}),
    delete: mock(() => {}),
  },
  SESSION_COOKIE_NAME: 'session_token',
  SESSION_COOKIE_MAX_AGE: 86400,
}));

const { GET } = await import('../route');

describe('/api/mychart-image', () => {
  beforeEach(() => {
    mockGetSession.mockClear();
    mockMychartRequest.makeRequest.mockClear();
  });

  it('returns 400 if token is missing', async () => {
    const req = new MockNextRequest('http://localhost/api/mychart-image?path=/foo');
    const res = await GET(req as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 if path is missing', async () => {
    const req = new MockNextRequest('http://localhost/api/mychart-image?token=valid');
    const res = await GET(req as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 if path does not start with /', async () => {
    const req = new MockNextRequest('http://localhost/api/mychart-image?token=valid&path=evil.com/img.png');
    const res = await GET(req as never);
    expect(res.status).toBe(400);
  });

  it('returns 401 for invalid session token', async () => {
    const req = new MockNextRequest('http://localhost/api/mychart-image?token=invalid&path=/img.png');
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it('proxies image with correct URL construction', async () => {
    const req = new MockNextRequest('http://localhost/api/mychart-image?token=valid&path=/UCSFMyChart/Image/Load%3FfileName%3Dabc');
    await GET(req as never);
    expect(mockMychartRequest.makeRequest).toHaveBeenCalledTimes(1);
    const config = mockMychartRequest.makeRequest.mock.calls[0][0];
    expect(config.url).toBe('https://mychart.example.org/UCSFMyChart/Image/Load?fileName=abc');
    expect(config.method).toBe('GET');
  });

  it('returns 400 if response is not an image', async () => {
    mockMychartRequest.makeRequest.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => 'text/html' },
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    }));
    const req = new MockNextRequest('http://localhost/api/mychart-image?token=valid&path=/img.png');
    const res = await GET(req as never);
    expect(res.status).toBe(400);
  });
});
