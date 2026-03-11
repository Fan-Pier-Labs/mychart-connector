import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/sessions';
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

    const mychartRequest = getSession(sessionKey);
    if (!mychartRequest) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 400 });
    }

    const profile = await getMyChartProfile(mychartRequest);
    if (!profile) {
      return NextResponse.json({ error: 'Could not parse profile' }, { status: 500 });
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
