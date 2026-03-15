import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth-helpers';
import { getSession, setSession, getSessionMetadata } from '@/lib/sessions';
import { acceptTermsAndConditions } from '../../../../../scrapers/myChart/termsAndConditions';
import { sessionStore } from '../../../../../scrapers/myChart/sessionStore';

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const { sessionKey } = await req.json();

    if (!sessionKey) {
      return NextResponse.json({ error: 'sessionKey is required' }, { status: 400 });
    }

    const mychartRequest = getSession(sessionKey);
    if (!mychartRequest) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 400 });
    }

    console.log(`[accept-terms] Accepting Terms & Conditions for sessionKey=${sessionKey}`);
    const accepted = await acceptTermsAndConditions(mychartRequest);

    if (!accepted) {
      return NextResponse.json({ state: 'error', error: 'Could not accept Terms & Conditions. Please try logging in again.' });
    }

    // Update session status to logged_in
    const metadata = getSessionMetadata(sessionKey);
    setSession(sessionKey, mychartRequest, metadata ?? undefined);
    sessionStore.setStatus(sessionKey, 'logged_in');

    // Check if this instance has no TOTP secret — offer setup
    const instanceId = sessionKey.split(':')[1];
    let offerTotpSetup = false;
    if (instanceId) {
      const { getMyChartInstance } = await import('@/lib/db');
      const userId = sessionKey.split(':')[0];
      const instance = await getMyChartInstance(instanceId, userId);
      if (instance && !instance.totpSecret) {
        offerTotpSetup = true;
      }
    }

    return NextResponse.json({ state: 'logged_in', sessionKey, offerTotpSetup, instanceId });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[accept-terms] Error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
