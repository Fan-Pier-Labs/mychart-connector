import { NextResponse } from 'next/server';

// GET / → 302 redirect to /MyChart/
// This is how the scraper discovers the firstPathPart
// Use the Host header so the redirect stays on the same domain the client used
// (in Docker Compose, request.url resolves to localhost but the client uses the service name)
export async function GET(request: Request) {
  const host = request.headers.get('host') || new URL(request.url).host;
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  return NextResponse.redirect(new URL(`${protocol}://${host}/MyChart/`), 302);
}
