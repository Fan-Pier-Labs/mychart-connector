import { NextResponse } from 'next/server';

// GET / → 302 redirect to /MyChart/Authentication/Login
// This is how the scraper discovers the firstPathPart
export async function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.redirect(new URL('/MyChart/', url.origin), 302);
}
