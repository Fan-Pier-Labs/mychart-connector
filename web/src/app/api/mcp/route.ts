import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from '@/lib/mcp/server';
import { validateApiKey } from '@/lib/mcp/api-keys';
import { sendTelemetryEvent } from '../../../../../shared/telemetry';

// Map of MCP session ID (transport-level) -> transport instance
const transports = new Map<string, WebStandardStreamableHTTPServerTransport>();

async function authenticateRequest(url: URL): Promise<{ userId: string } | null> {
  const key = url.searchParams.get('key');
  if (!key) return null;
  return validateApiKey(key);
}

export async function POST(req: Request) {
  sendTelemetryEvent('api_mcp_request');
  const url = new URL(req.url);

  // Check for existing MCP transport session via Mcp-Session-Id header
  const mcpSessionId = req.headers.get('mcp-session-id');

  if (mcpSessionId && transports.has(mcpSessionId)) {
    console.log(`[mcp-route] POST: reusing transport ${mcpSessionId}`);
    const transport = transports.get(mcpSessionId)!;
    try {
      return await transport.handleRequest(req);
    } catch (err) {
      const error = err as Error;
      console.error(`[mcp-route] POST: transport.handleRequest error (session=${mcpSessionId}):`, error.message, error.stack);
      return new Response(JSON.stringify({ error: `MCP transport error: ${error.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // New MCP session — authenticate via API key
  const auth = await authenticateRequest(url);
  if (!auth) {
    console.log(`[mcp-route] POST: auth failed (key=${url.searchParams.has('key') ? 'present' : 'missing'})`);
    return new Response(JSON.stringify({ error: 'Missing or invalid API key. Use ?key={apiKey}' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`[mcp-route] POST: creating new transport for user ${auth.userId} (${transports.size} existing transports)`);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    onsessioninitialized: (id) => {
      console.log(`[mcp-route] Transport initialized: ${id} for user ${auth.userId}`);
      transports.set(id, transport);
    },
    onsessionclosed: (id) => {
      console.log(`[mcp-route] Transport closed: ${id}`);
      transports.delete(id);
    },
    enableJsonResponse: true,
  });

  try {
    const server = createMcpServer(auth.userId);
    await server.connect(transport);
    return await transport.handleRequest(req);
  } catch (err) {
    const error = err as Error;
    console.error(`[mcp-route] POST: server setup/request error:`, error.message, error.stack);
    return new Response(JSON.stringify({ error: `MCP server error: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET(req: Request) {
  const mcpSessionId = req.headers.get('mcp-session-id');
  if (!mcpSessionId || !transports.has(mcpSessionId)) {
    return new Response(JSON.stringify({ error: 'Invalid or missing MCP session' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const transport = transports.get(mcpSessionId)!;
  return transport.handleRequest(req);
}

export async function DELETE(req: Request) {
  const mcpSessionId = req.headers.get('mcp-session-id');
  if (!mcpSessionId || !transports.has(mcpSessionId)) {
    return new Response(JSON.stringify({ error: 'Invalid or missing MCP session' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const transport = transports.get(mcpSessionId)!;
  const response = await transport.handleRequest(req);
  transports.delete(mcpSessionId);
  return response;
}
