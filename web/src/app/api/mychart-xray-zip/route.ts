import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/sessions';
import { getOrInitSession } from '@/lib/imaging-cache';
import { downloadSingleImage } from '../../../../../scrapers/myChart/eunity/imagingDirectDownload';
import { convertCloToJpg } from '../../../../../scrapers/myChart/clo-image-parser/clo_to_jpg';
import { zipSync } from 'fflate';

/**
 * Download all images for a set of (seriesUID, objectUID) pairs as a ZIP.
 * Images are downloaded on the fly using cached eUnity session cookies.
 *
 * Query params:
 *   - token, fdi: session identification
 *   - images: JSON array of {seriesUID, objectUID} pairs
 *   - description: series description for the ZIP filename
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const fdiParam = req.nextUrl.searchParams.get('fdi');
  const imagesParam = req.nextUrl.searchParams.get('images');
  const description = req.nextUrl.searchParams.get('description') ?? 'xray_images';

  if (!token || !fdiParam || !imagesParam) {
    return NextResponse.json({ error: 'Missing token, fdi, or images' }, { status: 400 });
  }

  if (!getSession(token)) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  let imageList: Array<{ seriesUID: string; objectUID: string }>;
  try {
    imageList = JSON.parse(imagesParam);
    if (!Array.isArray(imageList) || imageList.length === 0) throw new Error('empty');
  } catch {
    return NextResponse.json({ error: 'Invalid images parameter' }, { status: 400 });
  }

  try {
    const eunitySession = await getOrInitSession(token, fdiParam);

    const files: Record<string, [Uint8Array, { level: 0 }]> = {};
    const safeName = description.replace(/[^a-zA-Z0-9_ -]/g, '').trim();

    for (let i = 0; i < imageList.length; i++) {
      const { seriesUID, objectUID } = imageList[i];
      try {
        const cloData = await downloadSingleImage(eunitySession, seriesUID, objectUID);
        if (!cloData) continue;

        const jpegBuffer = await convertCloToJpg({ pixelData: cloData.pixelData, wrapperData: cloData.wrapperData });
        if (Buffer.isBuffer(jpegBuffer)) {
          files[`${safeName}_${i + 1}.jpg`] = [new Uint8Array(jpegBuffer), { level: 0 }];
        }
      } catch {
        // Skip failed downloads
      }
    }

    if (Object.keys(files).length === 0) {
      return NextResponse.json({ error: 'No images available' }, { status: 404 });
    }

    const zipBuffer = zipSync(files);
    const zipName = safeName || 'xray_images';

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}.zip"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
