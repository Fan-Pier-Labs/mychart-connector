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
    // Return only the key — the client builds the full MCP URL from window.location.origin
    // so it always reflects the real public URL regardless of proxy setup.
    return NextResponse.json({ key });
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
