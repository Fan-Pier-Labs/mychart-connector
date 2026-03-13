import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createDemoMcpServer } from '@/lib/mcp/demo-server';
import { sendTelemetryEvent } from '../../../../../../shared/telemetry';

export async function POST(req: Request) {
  sendTelemetryEvent('api_mcp_demo_request', { method: 'POST' });

  // Stateless mode: create a fresh server+transport per request.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
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

export async function GET() {
  return new Response(JSON.stringify({ error: 'SSE sessions not supported. Use POST for all requests.' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function DELETE() {
  return new Response(JSON.stringify({ error: 'Session management not supported in stateless mode.' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}
