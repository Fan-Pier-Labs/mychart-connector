import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/sessions';
import { getMyChartProfile } from '@/lib/mychart/profile';
import { requireAuth, AuthError } from '@/lib/auth-helpers';
import { sendTelemetryEvent } from '../../../../../shared/telemetry';

export async function POST(req: NextRequest) {
  sendTelemetryEvent('api_profile_fetch');
  try {
    await requireAuth(req);
    const { sessionKey } = await req.json();

    if (!sessionKey) {
      return NextResponse.json({ error: 'sessionKey is required' }, { status: 400 });
    }

    const entry = sessionStore.getEntry(sessionKey);
    if (!entry) {
      console.log(`[profile] No session found for key=${sessionKey}`);
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 400 });
    }

    console.log(`[profile] Fetching profile for ${entry.hostname} (status=${entry.status}, age=${Math.round((Date.now() - entry.createdAt.getTime()) / 1000)}s)`);

    if (entry.status !== 'logged_in') {
      console.log(`[profile] Session is not logged_in (status=${entry.status}), returning session_expired`);
      return NextResponse.json({ error: 'Session expired', code: 'session_expired' }, { status: 401 });
    }

    const mychartRequest = entry.request;
    const profile = await getMyChartProfile(mychartRequest);
    if (!profile) {
      console.log(`[profile] Could not parse profile for ${entry.hostname} — session may have expired during request`);
      entry.status = 'expired';
      return NextResponse.json({ error: 'Session expired', code: 'session_expired' }, { status: 401 });
    }
    return NextResponse.json(profile);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Profile fetch error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
