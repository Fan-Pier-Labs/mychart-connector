import { MyChartRequest } from './myChartRequest';
import { getRequestVerificationTokenFromBody } from './util';
import {
  createCredential,
  type MyChartCreationOptions,
  type PasskeyCredential,
} from './softwareAuthenticator';

function logUnexpectedResponse(label: string, resp: Response) {
  console.log(`  ${label} unexpected status: ${resp.status}`);
  console.log(`  ${label} response headers:`, Object.fromEntries(resp.headers.entries()));
}

/**
 * Get a CSRF token required for MyChart API endpoints.
 *
 * The /Home/CSRFToken endpoint returns different formats across instances:
 *   - JSON: { "Token": "..." }
 *   - Plain string: just the token value
 *   - HTML page with a hidden __RequestVerificationToken input
 *   - Empty body (e.g. Denver Health)
 *
 * If the endpoint returns empty, falls back to extracting the token
 * from the /Home page HTML.
 */
async function getCSRFToken(mychartRequest: MyChartRequest): Promise<string | null> {
  const res = await mychartRequest.makeRequest({
    path: '/Home/CSRFToken?noCache=' + Math.random(),
  });
  console.log('  CSRFToken response status:', res.status);
  const body = await res.text();
  if (body.toLowerCase().includes('termsconditions') || body.toLowerCase().includes('terms and conditions')) {
    console.log('  CSRF token request landed on Terms & Conditions page');
    return null;
  }
  // Try JSON format: { "Token": "..." } or { "token": "..." }
  const trimmed = body.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const token = parsed.Token ?? parsed.token ?? parsed.RequestVerificationToken ?? parsed.requestVerificationToken;
      if (token) {
        console.log('  Got CSRF token from JSON response');
        return token;
      }
    } catch {
      // not valid JSON, fall through
    }
  }
  // Try plain string (the entire response body is the token)
  if (trimmed && !trimmed.includes('<') && trimmed.length > 10) {
    console.log('  Got CSRF token as plain string');
    return trimmed;
  }
  // Try HTML hidden input
  const token = getRequestVerificationTokenFromBody(body);
  if (token) return token;

  // Fallback: extract token from /Home page HTML (works when the endpoint returns empty)
  console.log('  CSRFToken endpoint returned no token (length:', body.length, '), trying /Home page fallback');
  try {
    const homeRes = await mychartRequest.makeRequest({ path: '/Home' });
    const homeBody = await homeRes.text();
    const homeToken = getRequestVerificationTokenFromBody(homeBody);
    if (homeToken) {
      console.log('  Got CSRF token from /Home page fallback');
      return homeToken;
    }
    console.log('  Could not extract CSRF token from /Home page either');
  } catch (err) {
    console.log('  /Home page fallback failed:', err);
  }
  return null;
}

/**
 * Register a new passkey on a MyChart account.
 *
 * Flow (discovered via Playwright on UCSF MyChart):
 * 1. POST /api/passkey-management/GenerateCreateRequest — get WebAuthn creation options
 * 2. Software authenticator creates credential (replaces navigator.credentials.create)
 * 3. POST /api/passkey-management/CreatePasskey — submit credential to server
 *
 * Requires an active, authenticated session (logged in via password + 2FA first).
 *
 * Returns the PasskeyCredential for local storage, or null if setup fails.
 */
export async function setupPasskey(mychartRequest: MyChartRequest): Promise<PasskeyCredential | null> {

  // Get CSRF token for API requests
  const csrfToken = await getCSRFToken(mychartRequest);
  if (!csrfToken) {
    console.log('  Could not get CSRF token.');
    return null;
  }

  const origin = `${mychartRequest.protocol}://${mychartRequest.hostname}`;
  const apiHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    '__RequestVerificationToken': csrfToken,
    'X-Requested-With': 'XMLHttpRequest',
    'origin': origin,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  };

  // Step 1: Get WebAuthn creation options
  console.log('  Requesting passkey creation options...');
  const createReqResp = await mychartRequest.makeRequest({
    path: '/api/passkey-management/GenerateCreateRequest',
    method: 'POST',
    headers: apiHeaders,
    body: '{}',
  });
  if (createReqResp.status !== 200) {
    logUnexpectedResponse('GenerateCreateRequest', createReqResp);
    const body = await createReqResp.text();
    console.log('  GenerateCreateRequest response body:', body);
    return null;
  }
  const createReqResult = await createReqResp.json();

  if (!createReqResult.success && !createReqResult.Success) {
    console.log('  GenerateCreateRequest failed:', JSON.stringify(createReqResult));
    return null;
  }

  const creationOptions: MyChartCreationOptions = createReqResult.data || createReqResult.Data;
  if (!creationOptions || !creationOptions.challenge) {
    console.log('  Invalid creation options:', JSON.stringify(createReqResult));
    return null;
  }

  console.log('  Got creation options. RP:', creationOptions.rp.name,
    ', User:', creationOptions.user.displayName,
    ', Existing passkeys:', creationOptions.excludeCredentials.length);

  // Step 2: Create credential using software authenticator
  // Determine the index for the default name (one more than existing count)
  const indexForDefaultName = creationOptions.excludeCredentials.length + 1;

  const registrationResult = createCredential(creationOptions, origin, indexForDefaultName);
  console.log('  Created software credential. ID:', registrationResult.credential.credentialId.substring(0, 20) + '...');

  // Step 3: Submit credential to MyChart
  console.log('  Registering passkey with MyChart...');
  const createPasskeyResp = await mychartRequest.makeRequest({
    path: '/api/passkey-management/CreatePasskey',
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify(registrationResult.serverResponse),
  });
  if (createPasskeyResp.status !== 200) {
    logUnexpectedResponse('CreatePasskey', createPasskeyResp);
    const body = await createPasskeyResp.text();
    console.log('  CreatePasskey response body:', body);
    return null;
  }

  const createPasskeyResult = await createPasskeyResp.json();
  console.log('  CreatePasskey response:', JSON.stringify(createPasskeyResult));

  // Check for success — the response should contain passkey metadata
  if (createPasskeyResult.rawId || createPasskeyResult.RawId || createPasskeyResult.success || createPasskeyResult.Success) {
    console.log('  Passkey registered successfully!');
    return registrationResult.credential;
  }

  // Some instances might return just the passkey object directly
  if (createPasskeyResult.name || createPasskeyResult.Name) {
    console.log('  Passkey registered successfully! Name:', createPasskeyResult.name || createPasskeyResult.Name);
    return registrationResult.credential;
  }

  console.log('  Passkey registration may have failed. Check the response above.');
  return registrationResult.credential; // Return anyway — the credential was created
}

/**
 * List passkeys registered on a MyChart account.
 */
export async function listPasskeys(mychartRequest: MyChartRequest): Promise<unknown[] | null> {
  const csrfToken = await getCSRFToken(mychartRequest);
  if (!csrfToken) return null;

  const origin = `${mychartRequest.protocol}://${mychartRequest.hostname}`;
  const apiHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    '__RequestVerificationToken': csrfToken,
    'X-Requested-With': 'XMLHttpRequest',
    'origin': origin,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  };

  const resp = await mychartRequest.makeRequest({
    path: '/api/passkey-management/LoadPasskeyInfo',
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({ hostname: mychartRequest.hostname }),
  });

  if (resp.status !== 200) {
    logUnexpectedResponse('LoadPasskeyInfo', resp);
    return null;
  }

  const result = await resp.json();
  return result.passkeys || result.Passkeys || [];
}

/**
 * Delete a passkey from a MyChart account.
 */
export async function deletePasskey(mychartRequest: MyChartRequest, rawId: string): Promise<boolean> {
  const csrfToken = await getCSRFToken(mychartRequest);
  if (!csrfToken) return false;

  const origin = `${mychartRequest.protocol}://${mychartRequest.hostname}`;
  const apiHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    '__RequestVerificationToken': csrfToken,
    'X-Requested-With': 'XMLHttpRequest',
    'origin': origin,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  };

  const resp = await mychartRequest.makeRequest({
    path: '/api/passkey-management/DeletePasskey',
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({ rawId }),
  });

  if (resp.status !== 200) {
    logUnexpectedResponse('DeletePasskey', resp);
    return false;
  }

  console.log('  Passkey deleted successfully.');
  return true;
}
