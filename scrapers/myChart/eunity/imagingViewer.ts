import * as cheerio from 'cheerio';
import * as tough from 'tough-cookie';
import { MyChartRequest } from '../myChartRequest';
import { getRequestVerificationTokenFromBody } from '../util';
import { ReportContent } from '../labs_and_procedure_results/labtestresulttype';

/**
 * Fetch wrapper that uses Node's built-in fetch (undici) with tough-cookie jar.
 * We use the built-in fetch instead of node-fetch because the SAML selfauth endpoint
 * does TLS fingerprinting and rejects node-fetch's HTTP stack with "socket hang up".
 */
async function fetchWithCookies(
  jar: tough.CookieJar,
  url: string,
  opts: RequestInit & { headers?: Record<string, string> } = {}
): Promise<Response> {
  const cookies = await jar.getCookies(url);
  const cookieHeader = cookies.map(c => `${c.key}=${c.value}`).join('; ');

  const headers: Record<string, string> = { ...(opts.headers as Record<string, string> ?? {}) };
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }

  const response = await globalThis.fetch(url, { ...opts, headers });

  // Store Set-Cookie headers from response
  const setCookies = response.headers.getSetCookie?.() ?? [];
  for (const sc of setCookies) {
    try { await jar.setCookie(sc, url); } catch { /* ignore invalid cookies */ }
  }

  return response;
}

export interface FdiContext {
  fdi: string;
  ord: string;
}

export interface ImagingViewerSession {
  /** The SAML URL from FdiData - opens the image viewer when navigated to in a browser */
  samlUrl: string;
  /** The eUnity viewer URL (only available after following SAML chain) */
  viewerUrl?: string;
  /** JSESSIONID cookie for eUnity (only available after following SAML chain) */
  jsessionId?: string;
}

/**
 * Extract `data-fdi-context` (containing fdi and ord params) from report content HTML.
 * This is embedded in the HTML returned by the LoadReportContent API when the report
 * has an associated image viewer link.
 */
export function extractFdiContext(reportContentHtml: string): FdiContext | null {
  const $ = cheerio.load(reportContentHtml);
  const fdiElement = $('[data-fdi-context]');
  if (fdiElement.length === 0) return null;

  try {
    const raw = fdiElement.attr('data-fdi-context');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.fdi && parsed.ord) {
      return { fdi: parsed.fdi, ord: parsed.ord };
    }
  } catch {
    // data-fdi-context wasn't valid JSON
  }
  return null;
}

/**
 * Extract `data-copy-context` from report content HTML.
 * Format: "|||| Z15696837|54254.98||" - contains internal order/study IDs.
 */
export function extractCopyContext(reportContentHtml: string): string | null {
  const $ = cheerio.load(reportContentHtml);
  const el = $('[data-copy-context]');
  return el.attr('data-copy-context') ?? null;
}

/**
 * Get a fresh CSRF token from MyChart. This is needed for the FdiData API call.
 *
 * The /Home/CSRFToken endpoint returns empty body on some instances (e.g. Denver Health),
 * so we fall back to extracting the token from the /Home page HTML.
 */
async function getCSRFToken(mychartRequest: MyChartRequest): Promise<string | null> {
  const res = await mychartRequest.makeRequest({
    path: '/Home/CSRFToken?noCache=' + Math.random(),
  });
  const html = await res.text();
  const token = getRequestVerificationTokenFromBody(html);
  if (token) return token;

  // Fallback: extract token from /Home page HTML (works when the endpoint returns empty)
  try {
    const homeRes = await mychartRequest.makeRequest({ path: '/Home' });
    const homeBody = await homeRes.text();
    return getRequestVerificationTokenFromBody(homeBody) ?? null;
  } catch {
    return null;
  }
}

/**
 * Call the FdiData API to get the SAML URL that leads to the eUnity image viewer.
 *
 * Flow: MyChart → FdiData → SAML STS URL → (browser follows SAML chain) → eUnity viewer
 */
export async function getImageViewerSamlUrl(
  mychartRequest: MyChartRequest,
  fdiContext: FdiContext
): Promise<ImagingViewerSession | null> {
  const token = await getCSRFToken(mychartRequest);
  if (!token) {
    console.log('Could not get CSRF token for FdiData');
    return null;
  }

  const res = await mychartRequest.makeRequest({
    path: `/Extensibility/Redirection/FdiData?fdi=${encodeURIComponent(fdiContext.fdi)}&ord=${encodeURIComponent(fdiContext.ord)}&patientIndex=undefined&noCache=${Math.random()}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `__RequestVerificationToken=${encodeURIComponent(token)}`,
    followRedirects: false,
  });

  if (!res.ok) {
    console.log('FdiData request failed:', res.status);
    return null;
  }

  const data = await res.json() as { url: string; launchmode: number; IsFdiPost: boolean };

  if (!data.url) {
    console.log('FdiData response missing URL');
    return null;
  }

  return {
    samlUrl: data.url,
  };
}

/**
 * Follow the SAML chain from the STS URL to get an eUnity viewer session.
 *
 * Chain: STS URL → HTML form with SAMLResponse → POST to redirect endpoint →
 *        meta-refresh to selfauth → 302 redirect chain → eUnity server
 *
 * Uses its own cookie jar so cross-domain cookies accumulate
 * properly without polluting the MyChart cookie jar.
 *
 * Returns viewerUrl, jsessionId, AND the cookie jar so callers can make
 * authenticated requests to eUnity.
 */
export async function followSamlChain(
  _mychartRequest: MyChartRequest,
  samlUrl: string
): Promise<{ viewerUrl: string; jsessionId: string; cookieJar: tough.CookieJar; viewerBody: string } | null> {
  const jar = new tough.CookieJar();

  const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

  // Helper: make a request with the cookie jar, manually follow redirects
  async function req(url: string, opts: { method?: string; body?: string; contentType?: string } = {}) {
    const headers: Record<string, string> = { 'User-Agent': UA };
    if (opts.contentType) headers['Content-Type'] = opts.contentType;
    return fetchWithCookies(jar, url, {
      method: opts.method || 'GET',
      redirect: 'manual',
      headers,
      body: opts.body,
    });
  }

  try {
    // Step 1: Fetch the STS URL — returns HTML page with a SAML auto-submit form
    let url = samlUrl;
    let method = 'GET';
    let body: string | undefined;
    let contentType: string | undefined;
    let maxSteps = 15;

    while (maxSteps > 0) {
      maxSteps--;
      const res = await req(url, { method, body, contentType });

      // HTTP redirect — follow it
      if ([301, 302, 303, 307].includes(res.status)) {
        const loc = res.headers.get('location');
        if (!loc) break;
        url = new URL(loc, url).href;
        console.log(`  [SAML] ${res.status} -> ${url}`);
        method = 'GET';
        body = undefined;
        contentType = undefined;

        // Check if we've reached eUnity (detected by /e/viewer path)
        if (url.includes('/e/viewer') || url.includes('/eUnity/viewer')) {
          // The redirect itself IS the viewer URL — follow it to set JSESSIONID
          const viewerRes = await req(url);
          const viewerBody = viewerRes.status === 200 ? await viewerRes.text() : '';
          const eunityOrigin = new URL(url).origin;
          const jsessionCookies = await jar.getCookies(eunityOrigin);
          const jsession = jsessionCookies.find(c => c.key === 'JSESSIONID');
          return {
            viewerUrl: url,
            jsessionId: jsession?.value ?? '',
            cookieJar: jar,
            viewerBody,
          };
        }
        continue;
      }

      // 200 response — check for meta-refresh or auto-submit form
      if (res.status === 200) {
        const html = await res.text();
        console.log(`  [SAML] 200 at ${url} (${html.length} chars)`);
        if (html.length < 3000) console.log(`  [SAML] Body: ${html.substring(0, 2000)}`);

        // Check for meta-refresh: <meta http-equiv="refresh" content="0;URL='https://...'">
        const metaMatch = html.match(/http-equiv="refresh"\s+content="[^"]*URL='([^']+)'/i) ||
                          html.match(/http-equiv="refresh"\s+content="[^"]*url=([^"'\s>]+)/i);
        if (metaMatch) {
          url = new URL(metaMatch[1], url).href;
          method = 'GET';
          body = undefined;
          contentType = undefined;
          continue;
        }

        // Check for JavaScript redirect (e.g. window.location.href = '...')
        // The redirecttoviewer page uses JS to redirect to eUnity
        const jsRedirectMatch = html.match(/(?:window|document)\.location\.href\s*=\s*(?:url\d*|'([^']+)'|"([^"]+)")/i);
        if (jsRedirectMatch) {
          // If it's a variable reference (url2, url3), extract the URL from the var declaration
          let targetUrl = jsRedirectMatch[1] || jsRedirectMatch[2];
          if (!targetUrl) {
            // Variable reference — look for the var declaration
            const varMatch = html.match(/var\s+url\s*=\s*'([^']+)'/);
            if (varMatch) {
              targetUrl = varMatch[1].replace(/&amp;/g, '&');
            }
          }
          if (targetUrl) {
            url = new URL(targetUrl, url).href;
            method = 'GET';
            body = undefined;
            contentType = undefined;
            console.log(`  [SAML] JS redirect -> ${url}`);
            continue;
          }
        }

        // Check for auto-submit SAML form
        const $ = cheerio.load(html);
        const form = $('form');
        if (form.length > 0) {
          const action = form.attr('action');
          if (action) {
            const formData = new URLSearchParams();
            form.find('input[type="hidden"]').each((_, el) => {
              const name = $(el).attr('name');
              const value = $(el).attr('value');
              if (name) formData.set(name, value || '');
            });
            url = new URL(action, url).href;
            method = 'POST';
            body = formData.toString();
            contentType = 'application/x-www-form-urlencoded';
            continue;
          }
        }

        // Check if we're on eUnity
        if (url.includes('/e/viewer') || url.includes('/eUnity/viewer')) {
          const eunityOrigin = new URL(url).origin;
          const jsessionCookies = await jar.getCookies(eunityOrigin);
          const jsession = jsessionCookies.find(c => c.key === 'JSESSIONID');
          return {
            viewerUrl: url,
            jsessionId: jsession?.value ?? '',
            cookieJar: jar,
            viewerBody: html,
          };
        }

        // Reached a page that's not eUnity and has no redirect
        console.log('SAML chain stopped at:', url);
        break;
      }

      // Other status
      console.log(`SAML chain unexpected status ${res.status} at ${url}`);
      break;
    }

    console.log('SAML chain did not reach eUnity viewer');
    return null;
  } catch (err) {
    console.log('Error following SAML chain:', (err as Error).message);
    return null;
  }
}

/**
 * Get report content from MyChart's LoadReportContent API.
 * Returns the report HTML which may contain data-fdi-context for image viewer access.
 */
export async function getReportContentForImaging(
  mychartRequest: MyChartRequest,
  reportID: string,
  reportVars: { ordId: string; ordDat: string },
  requestVerificationToken: string
): Promise<ReportContent | null> {
  try {
    const res = await mychartRequest.makeRequest({
      path: '/api/report-content/LoadReportContent',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        __requestverificationtoken: requestVerificationToken,
      },
      body: JSON.stringify({
        reportID,
        assumedVariables: {
          ordId: reportVars.ordId,
          ordDat: reportVars.ordDat,
        },
        isFullReportPage: false,
        uniqueClass: 'EID-4',
        nonce: '',
      }),
      method: 'POST',
    });

    if (!res.ok) return null;
    return await res.json() as ReportContent;
  } catch {
    return null;
  }
}
