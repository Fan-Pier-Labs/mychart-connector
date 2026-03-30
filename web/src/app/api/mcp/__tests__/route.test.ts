import { describe, it, expect, mock, beforeEach } from 'bun:test';

// Mock validateApiKey before importing the route (include all exports for cross-file compat)
const mockValidateApiKey = mock(() => Promise.resolve(null as { userId: string } | null));
mock.module('@/lib/mcp/api-keys', () => ({
  validateApiKey: mockValidateApiKey,
  generateApiKey: mock(() => Promise.resolve('0'.repeat(64))),
  revokeApiKey: mock(() => Promise.resolve()),
  hasApiKey: mock(() => Promise.resolve(false)),
}));

// Mock MCP server creation
const mockConnect = mock(() => Promise.resolve());
const mockHandleRequest = mock(() => Promise.resolve(new Response('{"result": "ok"}', { status: 200 })));
const mockCreateMcpServer = mock(() => ({ connect: mockConnect }));
mock.module('@/lib/mcp/server', () => ({ createMcpServer: mockCreateMcpServer }));

// Mock the MCP SDK transport
mock.module('@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js', () => ({
  WebStandardStreamableHTTPServerTransport: class {
    constructor(_opts: unknown) {}
    handleRequest = mockHandleRequest;
  },
}));

const { POST, GET, DELETE } = await import('../route');

describe('POST /api/mcp', () => {
  beforeEach(() => {
    mockValidateApiKey.mockClear();
    mockCreateMcpServer.mockClear();
    mockConnect.mockClear();
    mockHandleRequest.mockClear();
  });

  it('returns 401 when no key query param', async () => {
    const req = new Request('http://localhost:3000/api/mcp', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/API key/i);
    expect(mockValidateApiKey).not.toHaveBeenCalled();
  });

  it('returns 401 when key is invalid', async () => {
    mockValidateApiKey.mockResolvedValueOnce(null);
    const req = new Request('http://localhost:3000/api/mcp?key=badkey', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(mockValidateApiKey).toHaveBeenCalledWith('badkey');
    expect(mockCreateMcpServer).not.toHaveBeenCalled();
  });

  it('creates MCP server and handles request for valid key', async () => {
    mockValidateApiKey.mockResolvedValueOnce({ userId: 'user-1' });
    mockHandleRequest.mockResolvedValueOnce(new Response('{"jsonrpc":"2.0","result":{}}', { status: 200 }));
    const req = new Request('http://localhost:3000/api/mcp?key=validkey', { method: 'POST' });
    const res = await POST(req);
    expect(mockValidateApiKey).toHaveBeenCalledWith('validkey');
    expect(mockCreateMcpServer).toHaveBeenCalledWith('user-1');
    expect(mockConnect).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});

describe('GET /api/mcp', () => {
  it('returns 405 (SSE not supported)', async () => {
    const res = await GET();
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.error).toMatch(/SSE/i);
  });
});

describe('DELETE /api/mcp', () => {
  it('returns 405 (session management not supported)', async () => {
    const res = await DELETE();
    expect(res.status).toBe(405);
  });
});
