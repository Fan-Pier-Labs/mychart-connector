/**
 * Fake eUnity imaging server routes.
 *
 * Handles: SAML chain (STS → ACS → viewer), AMF session init, image download.
 * All served from localhost:4000/e/* so the scraper sees a single-origin eUnity.
 */
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as homer from '@/data/homer';

// ─── In-memory eUnity sessions ──────────────────────────────────────
const eunitySessions = new Map<string, { initialized: boolean; ts: number; studyType: string }>();

function generateJsessionId(): string {
  return 'FAKE_JSESSIONID_' + Math.random().toString(36).substring(2, 18).toUpperCase();
}

function getJsessionFromCookie(request: NextRequest): string | null {
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.match(/JSESSIONID=([^;]+)/);
  return match ? match[1] : null;
}

// ─── Helpers ────────────────────────────────────────────────────────
function html(body: string, status = 200, extraHeaders: Record<string, string> = {}) {
  return new NextResponse(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...extraHeaders },
  });
}

function binary(data: Buffer, extraHeaders: Record<string, string> = {}) {
  return new Response(data as unknown as BodyInit, {
    headers: { 'Content-Type': 'application/octet-stream', ...extraHeaders },
  });
}

// ─── AMF3 Response Builder ──────────────────────────────────────────

interface StudyData {
  studyUID: string;
  series: Array<{
    seriesUID: string;
    seriesDescription: string;
    instanceUIDs?: string[];
    instanceUID?: string;
  }>;
}

/**
 * Build a minimal AMF3 response for getStudyListMeta.
 * The scraper's parseAmfResponse looks for "code" in the binary,
 * then reads an integer (0x04) and null (0x01).
 * The parseStudySeriesFromAmf scans for DICOM UID patterns.
 */
function buildAmfResponse(study: StudyData): Buffer {
  const parts: number[] = [];

  // AmfServicesMessage typed object marker
  parts.push(0x0a); // object marker
  parts.push(0x33); // traits: 3 members, sealed, inline
  // class name: "com.clientoutlook.web.metaservices.AmfServicesMessage"
  const className = 'com.clientoutlook.web.metaservices.AmfServicesMessage';
  writeAmfString(parts, className);
  // member names
  writeAmfString(parts, 'messageID');
  writeAmfString(parts, 'messageType');
  writeAmfString(parts, 'body');

  // messageID value
  parts.push(0x06); // string marker
  writeAmfString(parts, 'HTTPSimpleLoader_1');
  // messageType value
  parts.push(0x06);
  writeAmfString(parts, 'response');

  // body: AmfServicesResponse
  parts.push(0x0a); // object marker
  parts.push(0x23); // traits: 2 members, sealed, inline
  const respClass = 'com.clientoutlook.web.metaservices.AmfServicesResponse';
  writeAmfString(parts, respClass);
  writeAmfString(parts, 'code');
  writeAmfString(parts, 'response');
  // code = 0
  parts.push(0x04); // integer marker
  parts.push(0x00); // value 0
  // response = null
  parts.push(0x01); // null marker

  // Now append study UIDs as readable strings so parseStudySeriesFromAmf can find them
  // It scans for patterns like 1.X.X.X.X.X...
  const padding = Buffer.from('\x00\x00\x00\x00');
  const studyBuf = Buffer.from(study.studyUID);

  const trailingParts: Buffer[] = [padding, studyBuf, padding];
  for (const s of study.series) {
    const instances = s.instanceUIDs ?? (s.instanceUID ? [s.instanceUID] : []);
    trailingParts.push(Buffer.from(s.seriesDescription));
    trailingParts.push(padding);
    // For each instance, emit the seriesUID + instanceUID pair
    // The parser groups instances by seriesUID frequency
    for (const instanceUID of instances) {
      trailingParts.push(Buffer.from(s.seriesUID));
      trailingParts.push(padding);
      trailingParts.push(Buffer.from(instanceUID));
      trailingParts.push(padding);
    }
  }

  return Buffer.concat([Buffer.from(parts), ...trailingParts]);
}

function writeAmfString(buf: number[], str: string) {
  const bytes = Buffer.from(str, 'utf-8');
  // U29 inline string: (length << 1) | 1
  const len = bytes.length;
  if (len < 0x40) {
    buf.push((len << 1) | 1);
  } else if (len < 0x2000) {
    buf.push(((len << 1 | 1) >> 7) | 0x80);
    buf.push((len << 1 | 1) & 0x7F);
  } else {
    // For very long strings (shouldn't happen here)
    buf.push(((len << 1 | 1) >> 14) | 0x80);
    buf.push((((len << 1 | 1) >> 7) & 0x7F) | 0x80);
    buf.push((len << 1 | 1) & 0x7F);
  }
  buf.push(...bytes);
}

// ─── Real CLO Image Data ─────────────────────────────────────────────
// Pre-generated images for Homer's skull X-rays and CT scan.
// Each series maps to a different CLO image file.
const CLO_DATA_DIR = join(process.cwd(), 'src/data/clo-images');

// Per-series CLO data keyed by seriesUID
const seriesCloData = new Map<string, { wrapper: Buffer; pixel: Buffer }>();

// Load X-ray series CLO data
for (const s of homer.imaging.series) {
  const prefix = (s as { cloPrefix?: string }).cloPrefix ?? 'checkerboard_512x512';
  const wrapperBuf = readFileSync(join(CLO_DATA_DIR, `${prefix}_wrapper.clo`));
  const pixelBuf = readFileSync(join(CLO_DATA_DIR, `${prefix}_pixel.clo`));
  seriesCloData.set(s.seriesUID, {
    wrapper: Buffer.concat([wrapperBuf, pixelBuf]),
    pixel: pixelBuf,
  });
}

// Load CT series CLO data
for (const s of homer.ctImaging.series) {
  const prefix = (s as { cloPrefix?: string }).cloPrefix ?? 'checkerboard_512x512';
  const wrapperBuf = readFileSync(join(CLO_DATA_DIR, `${prefix}_wrapper.clo`));
  const pixelBuf = readFileSync(join(CLO_DATA_DIR, `${prefix}_pixel.clo`));
  seriesCloData.set(s.seriesUID, {
    wrapper: Buffer.concat([wrapperBuf, pixelBuf]),
    pixel: pixelBuf,
  });
}

// Fallback to first X-ray series for unmatched requests
const defaultSeries = homer.imaging.series[0];
const defaultClo = seriesCloData.get(defaultSeries.seriesUID)!;

// ─── Route handler ──────────────────────────────────────────────────
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const joined = path.join('/');
  const lower = joined.toLowerCase();

  // ── SAML STS page ─────────────────────────────────────────────
  if (lower === 'saml-sts' || lower.startsWith('saml-sts?')) {
    const origin = new URL(request.url).origin;
    const url = new URL(request.url);
    const studyType = url.searchParams.get('study') ?? 'xray';
    // Return HTML with auto-submit form (like a real SAML STS)
    return html(`<!DOCTYPE html>
<html><head><title>SAML STS</title></head><body>
<form method="POST" action="${origin}/e/saml-acs?study=${studyType}">
  <input type="hidden" name="SAMLResponse" value="fake-saml-response-token" />
  <input type="hidden" name="RelayState" value="fake-relay-state" />
  <noscript><button type="submit">Continue</button></noscript>
</form>
<script>document.forms[0].submit();</script>
</body></html>`);
  }

  // ── eUnity Viewer ─────────────────────────────────────────────
  if (lower.startsWith('viewer')) {
    const jsessionId = generateJsessionId();
    // Determine study type from the accession in the URL params
    const url = new URL(request.url);
    const accParam = url.searchParams.get('arg') ?? '';
    const studyType = accParam.includes(homer.ctImaging.accessionNumber) ? 'ct' : 'xray';
    eunitySessions.set(jsessionId, { initialized: false, ts: Date.now(), studyType });

    const img = studyType === 'ct' ? homer.ctImaging : homer.imaging;
    // The scraper extracts study params from viewer HTML body
    const viewerHtml = `<!DOCTYPE html>
<html><head><title>eUnity Viewer</title></head><body>
<div id="viewer-config" style="display:none">
{"accessionNumber":"${img.accessionNumber}","serviceInstance":"${img.serviceInstance}","patientId":"${img.patientId}","studyUID":"${img.studyUID}"}
</div>
<canvas id="mdiStage" width="1440" height="1644"></canvas>
</body></html>`;

    return html(viewerHtml, 200, {
      'Set-Cookie': `JSESSIONID=${jsessionId}; Path=/e; HttpOnly`,
    });
  }

  return new NextResponse('Not found', { status: 404 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const joined = path.join('/');
  const lower = joined.toLowerCase();

  // ── SAML ACS (Assertion Consumer Service) ─────────────────────
  if (lower === 'saml-acs' || lower.startsWith('saml-acs?')) {
    const origin = new URL(request.url).origin;
    const url = new URL(request.url);
    const studyType = url.searchParams.get('study') ?? 'xray';
    // Redirect to eUnity viewer with study params
    const img = studyType === 'ct' ? homer.ctImaging : homer.imaging;
    const viewerUrl = `${origin}/e/viewer?CLOAccessKeyID=fake-access-key&arg=accession%3D${img.accessionNumber}%26serviceInstance%3D${img.serviceInstance}%26patientId%3D${encodeURIComponent(img.patientId)}`;
    return NextResponse.redirect(viewerUrl, 302);
  }

  // ── AmfServicesServlet ────────────────────────────────────────
  if (lower === 'amfservicesservlet') {
    const jsessionId = getJsessionFromCookie(request);
    if (!jsessionId || !eunitySessions.has(jsessionId)) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    // Determine which study to serve based on the session
    const sessionData = eunitySessions.get(jsessionId)!;
    const studyType = sessionData.studyType ?? 'xray';
    const study = studyType === 'ct' ? homer.ctImaging : homer.imaging;

    // Mark session as initialized (required before CustomImageServlet works)
    eunitySessions.set(jsessionId, { ...sessionData, initialized: true, ts: Date.now() });

    const amfResponse = buildAmfResponse(study);
    return binary(amfResponse);
  }

  // ── CustomImageServlet ────────────────────────────────────────
  if (lower === 'customimageservlet') {
    const jsessionId = getJsessionFromCookie(request);
    if (!jsessionId || !eunitySessions.has(jsessionId)) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    const session = eunitySessions.get(jsessionId)!;
    if (!session.initialized) {
      return new NextResponse('Session not initialized', { status: 403 });
    }

    // Parse request body
    const body = await request.text();
    const formParams = new URLSearchParams(body);
    const requestType = formParams.get('requestType');
    const seriesUID = formParams.get('seriesUID') ?? '';

    // Look up per-series image data, fall back to default
    const clo = seriesCloData.get(seriesUID) ?? defaultClo;

    if (requestType === 'CLOWRAPPER') {
      return binary(clo.wrapper);
    } else if (requestType === 'CLOPIXEL') {
      return binary(clo.pixel);
    } else {
      return new NextResponse('CLOERROR: unsupported request type', { status: 400 });
    }
  }

  return new NextResponse('Not found', { status: 404 });
}
