import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth-helpers';
import {
  getUserNotificationPreferences,
  setUserNotificationPreferences,
  getUserClientEncryptionEnabled,
  rewrapUserCredentials,
} from '@/lib/db';
import { readClientKey } from '@/lib/client-key-header';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const prefs = await getUserNotificationPreferences(user.id);
    return NextResponse.json(prefs);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const cekHex = readClientKey(req);
    const body = await req.json();

    const enabled = typeof body.enabled === 'boolean' ? body.enabled : false;
    const includeContent = typeof body.includeContent === 'boolean' ? body.includeContent : false;

    // Enabling notifications requires server-side decryptable credentials
    // (single-layer), so if the user is currently in layered mode we must
    // re-wrap every stored credential with the env key only. This needs the
    // CEK from the browser one last time to peel off the outer layer.
    if (enabled) {
      const layered = await getUserClientEncryptionEnabled(user.id);
      if (layered) {
        if (!cekHex) {
          return NextResponse.json(
            { error: 'Client encryption key required to enable notifications' },
            { status: 400 },
          );
        }
        await rewrapUserCredentials(user.id, cekHex, 'single');
      }
    }

    await setUserNotificationPreferences(user.id, { enabled, includeContent });

    return NextResponse.json({ enabled, includeContent });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
