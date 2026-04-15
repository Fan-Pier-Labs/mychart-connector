import { NextRequest, NextResponse } from 'next/server';
import { complete2faFlow } from '@/lib/mychart/login';
import { getSession, setSession, getSessionMetadata } from '@/lib/sessions';
import { requireAuth, AuthError } from '@/lib/auth-helpers';
import { sendTelemetryEvent } from '../../../../../shared/telemetry';

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    sendTelemetryEvent('api_2fa_submit');
    const { sessionKey, code } = await req.json();

    if (!sessionKey || !code) {
      return NextResponse.json({ error: 'sessionKey and code are required' }, { status: 400 });
    }

    const mychartRequest = getSession(sessionKey);
    if (!mychartRequest) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 400 });
    }

    console.log(`[2fa] Completing 2FA for sessionKey=${sessionKey}`);
    const infoBefore = mychartRequest.getCookieInfo();
    console.log(`[2fa] Cookies before 2FA: ${infoBefore.count}`);

    const result = await complete2faFlow({ mychartRequest, code });
    console.log(`[2fa] 2FA result: ${result.state}`);

    if (result.state === 'invalid_2fa') {
      return NextResponse.json({ state: 'invalid_2fa', error: 'Invalid 2FA code' });
    }

    if (result.state === 'error') {
      return NextResponse.json({ state: 'error', error: 'Error completing 2FA' });
    }

    const infoAfter = result.mychartRequest.getCookieInfo();
    console.log(`[2fa] Cookies after 2FA: ${infoAfter.count} (was ${infoBefore.count})`);

    const metadata = getSessionMetadata(sessionKey);
    setSession(sessionKey, result.mychartRequest, metadata ?? undefined);

    // Check if this instance has no passkey — offer setup
    const instanceId = sessionKey.split(':')[1];
    let offerPasskeySetup = false;
    if (instanceId) {
      const { getMyChartInstance } = await import('@/lib/db');
      const userId = sessionKey.split(':')[0];
      const instance = await getMyChartInstance(instanceId, userId);
      if (instance && !instance.passkeyCredential) {
        offerPasskeySetup = true;
      }
    }

    return NextResponse.json({ state: 'logged_in', sessionKey, offerPasskeySetup, instanceId });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('2FA error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
