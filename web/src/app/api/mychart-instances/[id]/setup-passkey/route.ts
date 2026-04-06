import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth-helpers';
import { getMyChartInstance, updateMyChartInstance } from '@/lib/db';
import { getSession } from '@/lib/sessions';
import { setupPasskey } from '@/lib/mychart/login';
import { serializeCredential } from '@/lib/mychart/login';
import { sendTelemetryEvent } from '../../../../../../../shared/telemetry';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  sendTelemetryEvent('api_passkey_setup');
  try {
    const user = await requireAuth(req);
    const { id } = await params;

    const instance = await getMyChartInstance(id, user.id);
    if (!instance) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (instance.passkeyCredential) {
      return NextResponse.json({ error: 'Passkey is already configured for this instance' }, { status: 400 });
    }

    // Get the active session for this instance
    const sessionKey = `${user.id}:${instance.id}`;
    const mychartRequest = getSession(sessionKey);
    if (!mychartRequest) {
      return NextResponse.json({ error: 'No active session. Connect to this instance first.' }, { status: 400 });
    }

    console.log(`[setup-passkey] Setting up passkey for ${instance.hostname} (instance ${id})`);
    const credential = await setupPasskey(mychartRequest);

    if (!credential) {
      console.log(`[setup-passkey] Passkey setup failed for ${instance.hostname}`);
      return NextResponse.json({ success: false, error: 'Passkey setup failed. The MyChart instance may not support passkeys.' });
    }

    // Store the encrypted passkey credential
    await updateMyChartInstance(id, user.id, { passkeyCredential: serializeCredential(credential) });
    console.log(`[setup-passkey] Passkey configured successfully for ${instance.hostname}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[setup-passkey] Error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  sendTelemetryEvent('api_passkey_remove');
  try {
    const user = await requireAuth(req);
    const { id } = await params;

    const instance = await getMyChartInstance(id, user.id);
    if (!instance) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!instance.passkeyCredential) {
      return NextResponse.json({ error: 'No passkey configured for this instance' }, { status: 400 });
    }

    await updateMyChartInstance(id, user.id, { passkeyCredential: null });
    console.log(`[setup-passkey] Passkey removed for ${instance.hostname} (instance ${id})`);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[setup-passkey] Error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
