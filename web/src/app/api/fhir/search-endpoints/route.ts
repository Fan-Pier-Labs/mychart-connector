import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { searchEpicEndpoints } from '@/lib/fhir/endpoints';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    const q = req.nextUrl.searchParams.get('q') || '';
    if (!q.trim()) {
      return NextResponse.json({ endpoints: [] });
    }

    const endpoints = await searchEpicEndpoints(q);
    return NextResponse.json({ endpoints });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err) {
      const authErr = err as { status: number; message: string };
      return NextResponse.json({ error: authErr.message }, { status: authErr.status });
    }
    console.error('[fhir/search-endpoints] Error:', err);
    return NextResponse.json({ error: 'Failed to search endpoints' }, { status: 500 });
  }
}
