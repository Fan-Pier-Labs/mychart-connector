import { describe, it, expect, mock, beforeEach } from 'bun:test';

class MockNextRequest {
  url: string;
  headers: Map<string, string>;
  _body: unknown;
  constructor(url: string, body: unknown) {
    this.url = url;
    this.headers = new Map();
    this._body = body;
  }
  json() { return Promise.resolve(this._body); }
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

// Shared: mock getSession — returns a fake MyChartRequest when token is 'valid-token'
const FAKE_REQUEST = { hostname: 'mychart.example.com' };
const mockGetSession = mock((token: string) => token === 'valid-token' ? FAKE_REQUEST : undefined);
const mockSessionStore = {
  getEntry: (_key: string) => undefined,
  get: (_key: string) => undefined,
  set: mock(() => {}),
  delete: mock((_key: string) => {}),
};
// Include all @/lib/sessions exports for cross-file mock compat
mock.module('@/lib/sessions', () => ({
  getSession: mockGetSession,
  sessionStore: mockSessionStore,
  deleteSession: mock((_key: string) => {}),
  setSession: mock(() => {}),
}));

// NOTE: We intentionally do NOT mock @/lib/mychart/messages/sendReply or
// @/lib/mychart/messages/sendMessage here. Bun shares the module registry
// across all test files in a single bun test run, so mocking those modules
// here would contaminate the scraper unit tests in
// web/src/lib/mychart/messages/__tests__/. The success/error paths are
// covered by the scraper unit tests and integration tests.

const { POST: postSendNew } = await import('../send-new/route');
const { POST: postSendReply } = await import('../send-reply/route');
const { POST: postRecipients } = await import('../recipients/route');

function req(url: string, body: unknown) {
  return new MockNextRequest(url, body) as never;
}

// ── send-new ──────────────────────────────────────────────────────────────────

describe('POST /api/messages/send-new', () => {
  beforeEach(() => {
    mockGetSession.mockClear();
  });

  it('returns 400 for invalid/missing session token', async () => {
    const res = await postSendNew(req('/api/messages/send-new', {
      token: 'bad-token',
      recipient: { id: 'r1' }, topic: { id: 't1' },
      subject: 'Hello', messageBody: 'Hi',
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/session/i);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await postSendNew(req('/api/messages/send-new', {
      token: 'valid-token',
      // missing recipient, topic, subject, messageBody
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/recipient|topic|subject|messageBody/i);
  });
});

// ── send-reply ────────────────────────────────────────────────────────────────

describe('POST /api/messages/send-reply', () => {
  beforeEach(() => {
    mockGetSession.mockClear();
  });

  it('returns 400 for invalid session token', async () => {
    const res = await postSendReply(req('/api/messages/send-reply', {
      token: 'bad-token', conversationId: 'c1', messageBody: 'Hi',
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when conversationId is missing', async () => {
    const res = await postSendReply(req('/api/messages/send-reply', {
      token: 'valid-token', messageBody: 'Hi',
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/conversationId/i);
  });

  it('returns 400 when messageBody is missing', async () => {
    const res = await postSendReply(req('/api/messages/send-reply', {
      token: 'valid-token', conversationId: 'c1',
    }));
    expect(res.status).toBe(400);
  });
});

// ── recipients ────────────────────────────────────────────────────────────────

describe('POST /api/messages/recipients', () => {
  beforeEach(() => {
    mockGetSession.mockClear();
  });

  it('returns 400 for invalid session token', async () => {
    const res = await postRecipients(req('/api/messages/recipients', { token: 'bad-token' }));
    expect(res.status).toBe(400);
  });
});
