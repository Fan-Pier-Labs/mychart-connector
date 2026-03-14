import * as cheerio from 'cheerio';
import { MyChartRequest } from './myChartRequest';
import { getRequestVerificationTokenFromBody } from './util';

/**
 * Accept MyChart's Terms & Conditions on behalf of the user.
 *
 * Some MyChart instances (e.g. mychart.minuteclinic.com) present a T&C page
 * after login/2FA that must be accepted before any other page or API will work.
 * Every request redirects to /Authentication/TermsConditions until accepted.
 *
 * This should only be called after the user has explicitly consented to accept
 * the terms in the web app UI.
 *
 * Returns true if T&C was accepted successfully, false if it failed.
 */
export async function acceptTermsAndConditions(mychartRequest: MyChartRequest): Promise<boolean> {
  // Navigate to the T&C page
  const res = await mychartRequest.makeRequest({ path: '/Authentication/TermsConditions' });
  const body = await res.text();

  const $ = cheerio.load(body);

  // Extract the CSRF token from the T&C page
  const csrfToken = getRequestVerificationTokenFromBody(body);

  // Look for a form on the page
  const form = $('form');
  let formAction = '';
  if (form.length > 0) {
    formAction = form.attr('action') || '';
  }

  // Collect all hidden form fields
  const formFields: Record<string, string> = {};
  $('input[type="hidden"]').each((_, el) => {
    const name = $(el).attr('name');
    const value = $(el).attr('value') || '';
    if (name) {
      formFields[name] = value;
    }
  });

  if (!csrfToken) {
    console.log('[terms] No CSRF token found on Terms & Conditions page');
    console.log('[terms] Page HTML (first 2000 chars):', body.substring(0, 2000));
    return false;
  }

  // Build form-encoded body with all hidden fields
  const formBody = Object.entries(formFields)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  // Determine the POST URL
  let postPath = formAction;
  if (!postPath || postPath === '#') {
    postPath = '/Authentication/TermsConditions';
  }

  // If the form action starts with "/" it's a root-relative path that already
  // includes the firstPathPart (e.g. "/MyChart/Authentication/TermsConditions").
  // Convert it to an absolute URL to avoid makeRequest prepending firstPathPart again.
  const isAbsolute = postPath.startsWith('http');
  const isRootRelative = postPath.startsWith('/');
  let requestConfig: { url?: string; path?: string };
  if (isAbsolute) {
    requestConfig = { url: postPath };
  } else if (isRootRelative) {
    requestConfig = { url: `${mychartRequest.protocol}://${mychartRequest.hostname}${postPath}` };
  } else {
    requestConfig = { path: postPath };
  }

  console.log('[terms] Posting T&C acceptance to:', postPath);
  console.log('[terms] Form fields:', Object.keys(formFields).join(', '));

  const acceptResp = await mychartRequest.makeRequest({
    ...requestConfig,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
  });

  const acceptBody = await acceptResp.text();
  const acceptUrl = acceptResp.url || '';

  // Check if we're no longer on the T&C page
  if (!acceptUrl.toLowerCase().includes('termsconditions') &&
      !acceptBody.toLowerCase().includes('termsconditions')) {
    console.log('[terms] Terms & Conditions accepted successfully');
    return true;
  }

  // If still on T&C, try clicking accept links
  console.log('[terms] First POST did not clear T&C page');
  console.log('[terms] Response status:', acceptResp.status);
  console.log('[terms] Response headers:', Object.fromEntries(acceptResp.headers.entries()));
  console.log('[terms] Response body (first 1000 chars):', acceptBody.substring(0, 1000));

  // Look for accept buttons/links
  const $accept = cheerio.load(acceptBody);
  const acceptLinks: string[] = [];
  $accept('a, button').each((_, el) => {
    const text = $accept(el).text().toLowerCase().trim();
    if (text.includes('accept') || text.includes('agree') || text.includes('continue') || text.includes('i accept')) {
      const href = $accept(el).attr('href');
      if (href) acceptLinks.push(href);
    }
  });

  for (const link of acceptLinks) {
    console.log('[terms] Trying accept link:', link);
    const linkIsAbsolute = link.startsWith('http');
    const linkIsRootRelative = link.startsWith('/');
    let linkConfig: { url?: string; path?: string };
    if (linkIsAbsolute) {
      linkConfig = { url: link };
    } else if (linkIsRootRelative) {
      linkConfig = { url: `${mychartRequest.protocol}://${mychartRequest.hostname}${link}` };
    } else {
      linkConfig = { path: link };
    }
    const linkResp = await mychartRequest.makeRequest(linkConfig);
    const linkBody = await linkResp.text();
    const linkUrl = linkResp.url || '';

    if (!linkUrl.toLowerCase().includes('termsconditions') &&
        !linkBody.toLowerCase().includes('termsconditions')) {
      console.log('[terms] Terms & Conditions accepted via link');
      return true;
    }
  }

  console.log('[terms] Could not accept Terms & Conditions');
  console.log('[terms] Page HTML (first 2000 chars):', body.substring(0, 2000));
  return false;
}
