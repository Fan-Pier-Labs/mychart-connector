import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { encodeOAuthState, buildAuthorizationUrl } from '@/lib/fhir/oauth';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const body = await req.json() as { fhirBaseUrl?: string; organizationName?: string };
    const { fhirBaseUrl, organizationName } = body;

    if (!fhirBaseUrl || !organizationName) {
      return NextResponse.json(
        { error: 'fhirBaseUrl and organizationName are required' },
        { status: 400 }
      );
    }

    const state = await encodeOAuthState(user.id, fhirBaseUrl, organizationName);
    const authorizationUrl = await buildAuthorizationUrl(fhirBaseUrl, state);

    return NextResponse.json({ authorizationUrl });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err) {
      const authErr = err as { status: number; message: string };
      return NextResponse.json({ error: authErr.message }, { status: authErr.status });
    }
    console.error('[fhir/authorize] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to build authorization URL' },
      { status: 500 }
    );
  }
}
