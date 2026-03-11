import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createDemoMcpServer } from '@/lib/mcp/demo-server';
import { sendTelemetryEvent } from '../../../../../../shared/telemetry';

// Map of MCP session ID -> transport instance
const transports = new Map<string, WebStandardStreamableHTTPServerTransport>();

export async function POST(req: Request) {
  sendTelemetryEvent('api_mcp_demo_request', { method: 'POST' });
  // Check for existing MCP transport session via Mcp-Session-Id header
  const mcpSessionId = req.headers.get('mcp-session-id');

  if (mcpSessionId && transports.has(mcpSessionId)) {
    const transport = transports.get(mcpSessionId)!;
    try {
      return await transport.handleRequest(req);
    } catch (err) {
      const error = err as Error;
      return new Response(JSON.stringify({ error: `MCP transport error: ${error.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // New MCP session — no authentication required for demo
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    onsessioninitialized: (id) => {
      transports.set(id, transport);
    },
    onsessionclosed: (id) => {
      transports.delete(id);
    },
    enableJsonResponse: true,
  });

  try {
    const server = createDemoMcpServer();
    await server.connect(transport);
    return await transport.handleRequest(req);
  } catch (err) {
    const error = err as Error;
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
