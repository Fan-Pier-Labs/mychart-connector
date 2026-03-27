import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { getFhirConnection, deleteFhirConnection } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;
    const connection = await getFhirConnection(id, user.id);

    if (!connection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: connection.id,
      fhirServerUrl: connection.fhirServerUrl,
      organizationName: connection.organizationName,
      fhirPatientId: connection.fhirPatientId,
      scopes: connection.scopes,
      tokenExpiresAt: connection.tokenExpiresAt.toISOString(),
      connected: connection.tokenExpiresAt > new Date() || !!connection.refreshToken,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err) {
      const authErr = err as { status: number; message: string };
      return NextResponse.json({ error: authErr.message }, { status: authErr.status });
    }
    console.error('[fhir-connections/id] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;
    const deleted = await deleteFhirConnection(id, user.id);

    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err) {
      const authErr = err as { status: number; message: string };
      return NextResponse.json({ error: authErr.message }, { status: authErr.status });
    }
    console.error('[fhir-connections/id] Delete error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
