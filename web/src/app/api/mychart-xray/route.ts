import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/sessions';
import { downloadImagingStudyDirect } from '../../../../../scrapers/myChart/eunity/imagingDirectDownload';
import { convertCloToJpg } from '../../../../../scrapers/myChart/clo-to-jpg-converter/clo_to_jpg';

/**
 * Convert and serve X-ray images on-the-fly.
 *
 * MyChart X-ray images are stored in a proprietary CLO format accessible
 * via the eUnity DICOM viewer. This endpoint:
 * 1. Downloads CLO image data using the authenticated MyChart session
 * 2. Converts CLO → JPEG using the clo-to-jpg-converter
 * 3. Returns the JPEG
 *
 * No caching — fetches and converts fresh each time.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const fdiParam = req.nextUrl.searchParams.get('fdi');

  if (!token || !fdiParam) {
    return NextResponse.json({ error: 'Missing token or fdi' }, { status: 400 });
  }

  const mychartRequest = getSession(token);
  if (!mychartRequest) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  let fdiContext: { fdi: string; ord: string };
  try {
    fdiContext = JSON.parse(Buffer.from(fdiParam, 'base64').toString('utf-8'));
    if (!fdiContext.fdi || !fdiContext.ord) {
      throw new Error('Missing fdi or ord');
    }
  } catch {
    return NextResponse.json({ error: 'Invalid fdi parameter' }, { status: 400 });
  }

  try {
    const downloadResult = await downloadImagingStudyDirect(
      mychartRequest,
      fdiContext,
      '',
      '',
      { skipFileWrite: true, maxImages: 10 },
    );

    if (downloadResult.errors.length > 0 && downloadResult.images.length === 0) {
      return NextResponse.json({ error: downloadResult.errors.join('; ') }, { status: 502 });
    }

    // Find the first image with pixel data
    const image = downloadResult.images.find(img => img.pixelData);
    if (!image?.pixelData) {
      return NextResponse.json({ error: 'No image data available' }, { status: 404 });
    }

    const jpegBuffer = await convertCloToJpg(
      image.pixelData,
      null,
      image.wrapperData,
    );

    if (!Buffer.isBuffer(jpegBuffer)) {
      return NextResponse.json({ error: 'Conversion failed' }, { status: 500 });
    }

    return new NextResponse(jpegBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
