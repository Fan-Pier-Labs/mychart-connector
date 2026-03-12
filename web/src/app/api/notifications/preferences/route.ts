import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth-helpers';
import { getUserNotificationPreferences, setUserNotificationPreferences } from '@/lib/db';

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
    const body = await req.json();

    const enabled = typeof body.enabled === 'boolean' ? body.enabled : false;
    const includeContent = typeof body.includeContent === 'boolean' ? body.includeContent : false;

    await setUserNotificationPreferences(user.id, { enabled, includeContent });

    return NextResponse.json({ enabled, includeContent });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
