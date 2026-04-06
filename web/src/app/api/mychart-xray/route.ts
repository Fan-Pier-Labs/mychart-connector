import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/sessions';
import { getOrInitSession } from '@/lib/imaging-cache';
import { downloadSingleImage } from '../../../../../scrapers/myChart/eunity/imagingDirectDownload';
import { convertCloToJpg } from '../../../../../scrapers/myChart/clo-image-parser/clo_to_jpg';

/**
 * Serve a single X-ray image as lossless JPEG.
 *
 * Query params:
 *   - token: session token
 *   - fdi: base64-encoded FdiContext
 *   - seriesUID: DICOM series UID
 *   - objectUID: DICOM instance UID
 *
 * Uses cached eUnity session cookies to download the image on the fly.
 * No image caching — each request makes one CustomImageServlet call.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const fdiParam = req.nextUrl.searchParams.get('fdi');
  const seriesUID = req.nextUrl.searchParams.get('seriesUID');
  const objectUID = req.nextUrl.searchParams.get('objectUID');

  if (!token || !fdiParam || !seriesUID || !objectUID) {
    return NextResponse.json({ error: 'Missing token, fdi, seriesUID, or objectUID' }, { status: 400 });
  }

  if (!getSession(token)) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  try {
    const eunitySession = await getOrInitSession(token, fdiParam);

    const cloData = await downloadSingleImage(eunitySession, seriesUID, objectUID);
    if (!cloData) {
      return NextResponse.json({ error: 'Image not available' }, { status: 404 });
    }

    const jpegBuffer = await convertCloToJpg({
      pixelData: cloData.pixelData,
      wrapperData: cloData.wrapperData,
    });

    if (!Buffer.isBuffer(jpegBuffer)) {
      return NextResponse.json({ error: 'Conversion failed' }, { status: 500 });
    }

    return new NextResponse(jpegBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=600',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
