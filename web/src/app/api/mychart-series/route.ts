import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/sessions';
import { getOrInitSession } from '@/lib/imaging-cache';

/**
 * Initialize an eUnity session and return series metadata.
 *
 * Does SAML chain + AMF init (~5s), caches the session cookies.
 * Returns series list with UIDs so the client can request individual images.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const fdiParam = req.nextUrl.searchParams.get('fdi');

  if (!token || !fdiParam) {
    return NextResponse.json({ error: 'Missing token or fdi' }, { status: 400 });
  }

  if (!getSession(token)) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  try {
    const eunitySession = await getOrInitSession(token, fdiParam);

    // Group series entries by seriesUID for the client
    const seriesMap = new Map<string, {
      seriesUID: string;
      description: string;
      images: Array<{ seriesUID: string; objectUID: string }>;
    }>();

    for (const s of eunitySession.series) {
      const existing = seriesMap.get(s.seriesUID);
      if (existing) {
        existing.images.push({ seriesUID: s.seriesUID, objectUID: s.instanceUID });
      } else {
        seriesMap.set(s.seriesUID, {
          seriesUID: s.seriesUID,
          description: s.seriesDescription,
          images: [{ seriesUID: s.seriesUID, objectUID: s.instanceUID }],
        });
      }
    }

    const series = [...seriesMap.values()].map(s => ({
      seriesUID: s.seriesUID,
      description: s.description,
      imageCount: s.images.length,
      images: s.images,
    }));

    return NextResponse.json({ series });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
