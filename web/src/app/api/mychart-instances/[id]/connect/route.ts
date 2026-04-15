import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth-helpers';
import { getMyChartInstance } from '@/lib/db';
import { sessionStore } from '@/lib/sessions';
import { autoConnectInstance } from '@/lib/mcp/auto-connect';
import { readClientKey } from '@/lib/client-key-header';
import { sendTelemetryEvent } from '../../../../../../../shared/telemetry';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  sendTelemetryEvent('api_instance_connect');
  try {
    const user = await requireAuth(req);
    const cekHex = readClientKey(req);
    const { id } = await params;

    const instance = await getMyChartInstance(id, user.id, cekHex);
    if (!instance) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const sessionKey = `${user.id}:${instance.id}`;

    // Check if already connected with a valid (logged_in) session
    const existing = sessionStore.getEntry(sessionKey);
    if (existing && existing.status === 'logged_in') {
      console.log(`[connect] Reusing existing logged_in session for ${instance.hostname}`);
      return NextResponse.json({ state: 'logged_in', sessionKey });
    }
    if (existing) {
      console.log(`[connect] Existing session for ${instance.hostname} has status=${existing.status}, clearing for fresh login`);
      sessionStore.delete(sessionKey);
    }

    console.log(`[connect] Attempting auto-connect for ${instance.hostname} (user=${user.id}, hasTOTP=${!!instance.totpSecret})`);
    const result = await autoConnectInstance(user.id, instance);
    console.log(`[connect] Auto-connect result: ${result.state} for ${instance.hostname}`);

    if (result.state === 'error') {
      return NextResponse.json({ state: 'error', error: `Login failed for ${instance.hostname}. Check your credentials.` });
    }

    if (result.state === 'need_2fa') {
      return NextResponse.json({ state: 'need_2fa', sessionKey, twoFaDelivery: result.twoFaDelivery });
    }

    return NextResponse.json({ state: 'logged_in', sessionKey });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[connect] Error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
