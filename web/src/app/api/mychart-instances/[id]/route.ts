import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth-helpers';
import { getMyChartInstance, updateMyChartInstance, deleteMyChartInstance } from '@/lib/db';
import { getSession as getMyChartSession, deleteSession } from '@/lib/sessions';
import { normalizeHostname } from '@/lib/utils';
import { sendTelemetryEvent } from '../../../../../../shared/telemetry';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  sendTelemetryEvent('api_instance_get');
  try {
    const user = await requireAuth(req);
    const { id } = await params;
    const instance = await getMyChartInstance(id, user.id);
    if (!instance) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const sessionKey = `${user.id}:${instance.id}`;
    const connected = !!getMyChartSession(sessionKey);

    return NextResponse.json({
      id: instance.id,
      hostname: instance.hostname,
      username: instance.username,
      mychartEmail: instance.mychartEmail,
      hasTotpSecret: !!instance.totpSecret,
      hasPasskeyCredential: !!instance.passkeyCredential,
      enabled: instance.enabled,
      connected,
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  sendTelemetryEvent('api_instance_update');
  try {
    const user = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();

    if (body.hostname) {
      body.hostname = normalizeHostname(body.hostname);
    }

    const instance = await updateMyChartInstance(id, user.id, body);
    if (!instance) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: instance.id,
      hostname: instance.hostname,
      username: instance.username,
      mychartEmail: instance.mychartEmail,
      hasTotpSecret: !!instance.totpSecret,
      hasPasskeyCredential: !!instance.passkeyCredential,
      enabled: instance.enabled,
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  sendTelemetryEvent('api_instance_delete');
  try {
    const user = await requireAuth(req);
    const { id } = await params;

    // Clean up any active MyChart session
    const sessionKey = `${user.id}:${id}`;
    deleteSession(sessionKey);

    const deleted = await deleteMyChartInstance(id, user.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
