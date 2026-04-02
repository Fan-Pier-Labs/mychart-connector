import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/sessions';
import { downloadImagingStudyDirect } from '../../../../../scrapers/myChart/eunity/imagingDirectDownload';

/**
 * Fetch the series list for an imaging study.
 *
 * Follows FdiData → SAML → AMF to get series info from eUnity (~5 seconds).
 * Returns series names and slice counts without downloading actual images.
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
    // maxImages: 0 — only do SAML + AMF init to get series list, skip image downloads
    const downloadResult = await downloadImagingStudyDirect(
      mychartRequest,
      fdiContext,
      '',
      '',
      { skipFileWrite: true, maxImages: 0 },
    );

    if (!downloadResult.seriesList || downloadResult.seriesList.length === 0) {
      if (downloadResult.errors.length > 0) {
        return NextResponse.json({ error: downloadResult.errors.join('; ') }, { status: 502 });
      }
      return NextResponse.json({ error: 'No series found' }, { status: 404 });
    }

    return NextResponse.json({ series: downloadResult.seriesList });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
