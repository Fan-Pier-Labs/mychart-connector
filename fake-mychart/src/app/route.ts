import { NextResponse } from 'next/server';

// GET / → 302 redirect to /MyChart/
// This is how the scraper discovers the firstPathPart
// Use the Host header so the redirect stays on the same domain the client used
// (in Docker Compose, request.url resolves to localhost but the client uses the service name)
export async function GET(request: Request) {
  const host = request.headers.get('host') || new URL(request.url).host;
  // CloudFront sets cloudfront-forwarded-proto; ALB sets x-forwarded-proto
  const protocol = request.headers.get('cloudfront-forwarded-proto')
    || request.headers.get('x-forwarded-proto')
    || (host.includes('localhost') || !host.includes('.') ? 'http' : 'https');
  return NextResponse.redirect(new URL(`${protocol}://${host}/MyChart/`), 302);
}
