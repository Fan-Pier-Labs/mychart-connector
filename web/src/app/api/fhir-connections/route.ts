import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { getFhirConnections } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const connections = await getFhirConnections(user.id);

    // Return without sensitive token data
    const safe = connections.map((c) => ({
      id: c.id,
      fhirServerUrl: c.fhirServerUrl,
      organizationName: c.organizationName,
      fhirPatientId: c.fhirPatientId,
      scopes: c.scopes,
      tokenExpiresAt: c.tokenExpiresAt.toISOString(),
      connected: c.tokenExpiresAt > new Date() || !!c.refreshToken,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return NextResponse.json({ connections: safe });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err) {
      const authErr = err as { status: number; message: string };
      return NextResponse.json({ error: authErr.message }, { status: authErr.status });
    }
    console.error('[fhir-connections] Error:', err);
    return NextResponse.json({ error: 'Failed to list FHIR connections' }, { status: 500 });
  }
}
