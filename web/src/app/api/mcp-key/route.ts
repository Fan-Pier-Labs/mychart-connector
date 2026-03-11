import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth-helpers';
import { generateApiKey, revokeApiKey, hasApiKey } from '@/lib/mcp/api-keys';
import { sendTelemetryEvent } from '../../../../../shared/telemetry';

export async function GET(req: NextRequest) {
  sendTelemetryEvent('api_mcp_key_check');
  try {
    const user = await requireAuth(req);
    const exists = await hasApiKey(user.id);
    return NextResponse.json({ hasKey: exists });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  sendTelemetryEvent('api_mcp_key_generate');
  try {
    const user = await requireAuth(req);
    const key = await generateApiKey(user.id);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const mcpUrl = `${baseUrl}/api/mcp?key=${key}`;

    const response: Record<string, string> = { key, mcpUrl };

    if (process.env.NODE_ENV === 'development') {
      const httpPort = parseInt(req.nextUrl.port || '3000');
      const sslPort = process.env.HTTPS_PORT || String(httpPort + 1);
      response.mcpUrlSsl = `https://localhost:${sslPort}/api/mcp?key=${key}`;
    }

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  sendTelemetryEvent('api_mcp_key_revoke');
  try {
    const user = await requireAuth(req);
    await revokeApiKey(user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
