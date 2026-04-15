import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from '@/lib/mcp/server';
import { validateApiKey } from '@/lib/mcp/api-keys';
import { sendTelemetryEvent } from '../../../../../shared/telemetry';

interface AuthResult {
  userId: string;
  cekHex: string | null;
}

// URL format: `?key=<apiKey>` or `?key=<apiKey>.<cekHex>`.
// The optional CEK is the user's client-side encryption key, which lives only
// in their browser's localStorage + inside the MCP URL. It's used to peel the
// outer encryption layer when a user has `client_encryption_enabled = true`.
async function authenticateRequest(url: URL): Promise<AuthResult | null> {
  const raw = url.searchParams.get('key');
  if (!raw) return null;
  const sepIdx = raw.indexOf('.');
  const apiKey = sepIdx === -1 ? raw : raw.slice(0, sepIdx);
  const cekHex = sepIdx === -1 ? null : raw.slice(sepIdx + 1);
  const result = await validateApiKey(apiKey);
  if (!result) return null;
  return { userId: result.userId, cekHex: cekHex && cekHex.length > 0 ? cekHex : null };
}

export async function POST(req: Request) {
  sendTelemetryEvent('api_mcp_request');
  const url = new URL(req.url);

  const auth = await authenticateRequest(url);
  if (!auth) {
    console.log(`[mcp-route] POST: auth failed (key=${url.searchParams.has('key') ? 'present' : 'missing'})`);
    return new Response(JSON.stringify({ error: 'Missing or invalid API key. Use ?key={apiKey}.{clientKey}' }), {
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
    const server = createMcpServer(auth.userId, auth.cekHex);
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
