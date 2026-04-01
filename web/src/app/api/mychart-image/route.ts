import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/sessions';

/**
 * Proxy image requests to MyChart.
 *
 * Images in MyChart HTML (messages, letters) reference relative URLs like
 * /UCSFMyChart/Image/Load?fileName=... which 404 on our domain. This endpoint
 * proxies those requests using the user's authenticated MyChart session.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const path = req.nextUrl.searchParams.get('path');

  if (!token || !path) {
    return NextResponse.json({ error: 'Missing token or path' }, { status: 400 });
  }

  // SSRF prevention: only allow paths starting with /
  if (!path.startsWith('/')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const mychartRequest = getSession(token);
  if (!mychartRequest) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  try {
    // The path already includes the firstPathPart (e.g., /UCSFMyChart/Image/Load?...)
    // so we build the full URL directly rather than using config.path
    const fullUrl = `${mychartRequest.protocol}://${mychartRequest.hostname}${path}`;

    const response = await mychartRequest.makeRequest({
      url: fullUrl,
      method: 'GET',
      headers: {
        'Accept': 'image/*,*/*',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/png';

    // Only proxy image responses
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Response is not an image' }, { status: 400 });
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
