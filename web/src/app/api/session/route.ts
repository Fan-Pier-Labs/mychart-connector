import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { getMyChartInstancesMetadata, getUserClientEncryptionEnabled } from '@/lib/db';
import { getSession as getMyChartSession } from '@/lib/sessions';
import { hasGoogleOAuth } from '@/lib/mcp/config';
import { sendTelemetryEvent } from '../../../../../shared/telemetry';

export async function GET(req: NextRequest) {
  sendTelemetryEvent('api_session_check');
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ authenticated: false, googleOAuthEnabled: hasGoogleOAuth() }, { status: 401 });
    }

    // Metadata-only lookup — avoids needing the browser's Client Encryption Key
    // just to render the account list.
    const instances = await getMyChartInstancesMetadata(session.user.id);
    const instancesWithStatus = instances.map((inst) => {
      const sessionKey = `${session.user.id}:${inst.id}`;
      const connected = !!getMyChartSession(sessionKey);
      return {
        id: inst.id,
        hostname: inst.hostname,
        username: inst.username,
        mychartEmail: inst.mychartEmail,
        hasTotpSecret: inst.hasTotpSecret,
        hasPasskeyCredential: inst.hasPasskeyCredential,
        connected,
        createdAt: inst.createdAt,
        updatedAt: inst.updatedAt,
      };
    });

    const clientEncryptionEnabled = await getUserClientEncryptionEnabled(session.user.id);

    return NextResponse.json({
      authenticated: true,
      googleOAuthEnabled: hasGoogleOAuth(),
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        clientEncryptionEnabled,
      },
      instances: instancesWithStatus,
    });
  } catch (err) {
    console.error('[Session] Error:', err);
    return NextResponse.json({ authenticated: false, googleOAuthEnabled: hasGoogleOAuth() }, { status: 401 });
  }
}
