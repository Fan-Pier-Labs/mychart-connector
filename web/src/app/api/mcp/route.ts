import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from '@/lib/mcp/server';
import { validateApiKey } from '@/lib/mcp/api-keys';
import { sendTelemetryEvent } from '../../../../../shared/telemetry';

async function authenticateRequest(req: Request): Promise<{ userId: string } | null> {
  const url = new URL(req.url);
  let key = url.searchParams.get('key');
  if (!key) {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      key = authHeader.slice(7).trim();
    }
  }
  if (!key) return null;
  return validateApiKey(key);
}

export async function POST(req: Request) {
  sendTelemetryEvent('api_mcp_request');
  const url = new URL(req.url);

  const auth = await authenticateRequest(req);
  if (!auth) {
    const hasKey = url.searchParams.has('key');
    const hasBearer = !!req.headers.get('authorization') || !!req.headers.get('Authorization');
    console.log(`[mcp-route] POST: auth failed (queryKey=${hasKey} bearer=${hasBearer})`);
    return new Response(JSON.stringify({ error: 'Missing or invalid API key. Use ?key={apiKey} or Authorization: Bearer <key>' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Stateless mode: create a fresh server+transport per request.
  // No session ID is issued, so requests survive server restarts/redeployments.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
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
