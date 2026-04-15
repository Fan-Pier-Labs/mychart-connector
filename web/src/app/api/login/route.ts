import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth-helpers';
import { getMyChartInstance } from '@/lib/db';
import { myChartUserPassLogin } from '@/lib/mychart/login';
import { setSession } from '@/lib/sessions';
import { readClientKey } from '@/lib/client-key-header';
import { sendTelemetryEvent } from '../../../../../shared/telemetry';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const cekHex = readClientKey(req);
    const { myChartInstanceId, hostname, username, password } = await req.json();
    sendTelemetryEvent('api_login_attempt', { host: hostname || 'instance' });

    // If an instance ID is provided, look up credentials from DB
    if (myChartInstanceId) {
      const instance = await getMyChartInstance(myChartInstanceId, user.id, cekHex);
      if (!instance) {
        return NextResponse.json({ error: 'MyChart instance not found' }, { status: 404 });
      }

      const sessionKey = `${user.id}:${instance.id}`;
      console.log(`[login] Attempting login to ${instance.hostname} as ${instance.username} (instance ${instance.id})`);
      const result = await myChartUserPassLogin({ hostname: instance.hostname, user: instance.username, pass: instance.password });
      console.log(`[login] Login result: ${result.state}`);

      if (result.state === 'invalid_login') {
        return NextResponse.json({ state: 'invalid_login', error: 'Invalid username or password' });
      }
      if (result.state === 'error') {
        return NextResponse.json({ state: 'error', error: result.error });
      }

      setSession(sessionKey, result.mychartRequest, { hostname: instance.hostname });

      if (result.state === 'need_2fa') {
        return NextResponse.json({ state: 'need_2fa', sessionKey, twoFaDelivery: result.twoFaDelivery });
      }

      return NextResponse.json({ state: 'logged_in', sessionKey });
    }

    // Fallback: raw credentials (for backwards compatibility)
    if (!hostname || !username || !password) {
      return NextResponse.json({ error: 'hostname, username, and password (or myChartInstanceId) are required' }, { status: 400 });
    }

    const sessionKey = `${user.id}:adhoc:${Date.now()}`;
    console.log(`[login] Attempting adhoc login to ${hostname} as ${username}`);
    const result = await myChartUserPassLogin({ hostname, user: username, pass: password });
    console.log(`[login] Login result: ${result.state}`);

    if (result.state === 'invalid_login') {
      return NextResponse.json({ state: 'invalid_login', error: 'Invalid username or password' });
    }
    if (result.state === 'error') {
      return NextResponse.json({ state: 'error', error: result.error });
    }

    setSession(sessionKey, result.mychartRequest, { hostname });

    if (result.state === 'need_2fa') {
      return NextResponse.json({ state: 'need_2fa', sessionKey, twoFaDelivery: result.twoFaDelivery });
    }

    return NextResponse.json({ state: 'logged_in', sessionKey });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Login error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
