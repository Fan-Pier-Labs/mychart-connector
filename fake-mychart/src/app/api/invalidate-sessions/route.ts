import { NextResponse } from 'next/server';
import { deleteAllSessions } from '@/lib/session';

/**
 * POST /api/invalidate-sessions
 *
 * Test-only endpoint that clears all fake-mychart sessions.
 * Used by CI integration tests to simulate session expiry.
 */
export async function POST() {
  const count = deleteAllSessions();
  return NextResponse.json({ deleted: count });
}
