import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CANONICAL_HOSTNAME = 'openrecord.fanpierlabs.com';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0];

  if (host && host !== 'localhost' && host !== CANONICAL_HOSTNAME) {
    const url = request.nextUrl.clone();
    url.hostname = CANONICAL_HOSTNAME;
    url.port = '';
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
