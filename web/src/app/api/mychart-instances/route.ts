import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth-helpers';
import { createMyChartInstance, getMyChartInstances } from '@/lib/db';
import { normalizeHostname } from '@/lib/utils';
import { autoConnectInstance } from '@/lib/mcp/auto-connect';
import { sessionStore } from '@/lib/sessions';
import { sendTelemetryEvent } from '../../../../../shared/telemetry';
import { isBlockedInstance } from '../../../../../shared/blockedInstances';

export async function GET(req: NextRequest) {
  sendTelemetryEvent('api_instances_list');
  try {
    const user = await requireAuth(req);
    const instances = await getMyChartInstances(user.id);

    // Auto-connect instances with passkey or TOTP that aren't already logged in (skip disabled)
    await Promise.all(
      instances
        .filter((inst) => {
          if (!inst.enabled) return false;
          if (!inst.totpSecret && !inst.passkeyCredential) return false;
          const entry = sessionStore.getEntry(`${user.id}:${inst.id}`);
          return !entry || entry.status !== 'logged_in';
        })
        .map((inst) => autoConnectInstance(user.id, inst).catch((err) => {
          console.error(`[auto-connect] Failed to auto-connect ${inst.hostname}:`, (err as Error).message);
        }))
    );

    // Check connection status for each instance
    const instancesWithStatus = instances.map((inst) => {
      const sessionKey = `${user.id}:${inst.id}`;
      const entry = sessionStore.getEntry(sessionKey);
      const connected = !!entry && entry.status === 'logged_in';
      return {
        id: inst.id,
        hostname: inst.hostname,
        username: inst.username,
        mychartEmail: inst.mychartEmail,
        hasTotpSecret: !!inst.totpSecret,
        hasPasskeyCredential: !!inst.passkeyCredential,
        enabled: inst.enabled,
        connected,
        createdAt: inst.createdAt,
        updatedAt: inst.updatedAt,
      };
    });

    return NextResponse.json(instancesWithStatus);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  sendTelemetryEvent('api_instance_create');
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { hostname, username, password, totpSecret, mychartEmail } = body;

    if (!hostname || !username || !password) {
      return NextResponse.json({ error: 'hostname, username, and password are required' }, { status: 400 });
    }

    const normalized = normalizeHostname(hostname);

    if (isBlockedInstance(normalized)) {
      return NextResponse.json({ error: 'This MyChart instance is not supported. central.mychart.org is a portal aggregator and cannot be scraped directly. Please add the individual hospital MyChart instance instead.' }, { status: 400 });
    }

    const instance = await createMyChartInstance(user.id, {
      hostname: normalized,
      username,
      password,
      totpSecret,
      mychartEmail,
    });


    return NextResponse.json({
      id: instance.id,
      hostname: instance.hostname,
      username: instance.username,
      mychartEmail: instance.mychartEmail,
      hasTotpSecret: !!instance.totpSecret,
      enabled: instance.enabled,
      connected: false,
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt,
    }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // Handle unique constraint violation
    if ((err as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'A MyChart account with this hostname and username already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
