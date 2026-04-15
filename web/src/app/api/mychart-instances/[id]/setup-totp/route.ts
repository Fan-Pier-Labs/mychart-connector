import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth-helpers';
import { getMyChartInstance, updateMyChartInstance } from '@/lib/db';
import { getSession } from '@/lib/sessions';
import { setupTotp } from '@/lib/mychart/totp';
import { readClientKey } from '@/lib/client-key-header';
import { sendTelemetryEvent } from '../../../../../../../shared/telemetry';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  sendTelemetryEvent('api_totp_setup');
  try {
    const user = await requireAuth(req);
    const cekHex = readClientKey(req);
    const { id } = await params;

    const instance = await getMyChartInstance(id, user.id, cekHex);
    if (!instance) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (instance.totpSecret) {
      return NextResponse.json({ error: 'TOTP is already configured for this instance' }, { status: 400 });
    }

    // Get the active session for this instance
    const sessionKey = `${user.id}:${instance.id}`;
    const mychartRequest = getSession(sessionKey);
    if (!mychartRequest) {
      return NextResponse.json({ error: 'No active session. Connect to this instance first.' }, { status: 400 });
    }

    console.log(`[setup-totp] Setting up TOTP for ${instance.hostname} (instance ${id})`);
    const result = await setupTotp(mychartRequest, instance.password);

    if (!result.secret) {
      console.log(`[setup-totp] TOTP setup failed for ${instance.hostname}: ${result.error}`);
      return NextResponse.json({ success: false, error: result.error || 'TOTP setup failed.' });
    }

    // Store the encrypted TOTP secret
    await updateMyChartInstance(id, user.id, { totpSecret: result.secret }, cekHex);
    console.log(`[setup-totp] TOTP configured successfully for ${instance.hostname}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[setup-totp] Error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
