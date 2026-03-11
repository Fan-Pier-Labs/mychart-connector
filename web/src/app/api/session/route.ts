import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { getMyChartInstances } from '@/lib/db';
import { getSession as getMyChartSession } from '@/lib/sessions';
import { sendTelemetryEvent } from '../../../../../shared/telemetry';

export async function GET(req: NextRequest) {
  sendTelemetryEvent('api_session_check');
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Get user's MyChart instances with connection status
    const instances = await getMyChartInstances(session.user.id);
    const instancesWithStatus = instances.map((inst) => {
      const sessionKey = `${session.user.id}:${inst.id}`;
      const connected = !!getMyChartSession(sessionKey);
      return {
        id: inst.id,
        hostname: inst.hostname,
        username: inst.username,
        mychartEmail: inst.mychartEmail,
        hasTotpSecret: !!inst.totpSecret,
        connected,
        createdAt: inst.createdAt,
        updatedAt: inst.updatedAt,
      };
    });

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
      instances: instancesWithStatus,
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
