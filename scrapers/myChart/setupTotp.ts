import { MyChartRequest } from './myChartRequest';
import { getRequestVerificationTokenFromBody } from './util';
import { generateTotpCode } from './totp';
import { logger } from '../../shared/logger';

export interface SetupTotpResult {
  secret: string | null;
  error?: string;
}

function logUnexpectedResponse(label: string, resp: Response) {
  logger.debug(`  ${label} unexpected status: ${resp.status}`);
  logger.debug(`  ${label} response headers:`, Object.fromEntries(resp.headers.entries()));
}

/**
 * Get a CSRF token required for MyChart API endpoints.
 * The /Home/CSRFToken endpoint may return:
 *   - JSON: { "Token": "..." } or { "token": "..." }
 *   - Plain string: just the token value
 *   - HTML page with a hidden __RequestVerificationToken input (fallback)
 */
async function getCSRFToken(mychartRequest: MyChartRequest): Promise<string | null> {
  const res = await mychartRequest.makeRequest({
    path: '/Home/CSRFToken?noCache=' + Math.random(),
  });
  logger.debug('  CSRFToken response status:', res.status);
  const body = await res.text();
  // If we landed on the T&C page instead of getting a CSRF token, that's a problem
  if (body.toLowerCase().includes('termsconditions') || body.toLowerCase().includes('terms and conditions')) {
    logger.debug('  CSRF token request landed on Terms & Conditions page');
    return null;
  }
  // Try JSON format first: { "Token": "..." } or { "token": "..." }
  const trimmed = body.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const token = parsed.Token ?? parsed.token ?? parsed.RequestVerificationToken ?? parsed.requestVerificationToken;
      if (token) {
        logger.debug('  Got CSRF token from JSON response');
        return token;
      }
    } catch {
      // not valid JSON, fall through
    }
  }
  // Try plain string (the entire response body is the token)
  if (trimmed && !trimmed.includes('<') && trimmed.length > 10) {
    logger.debug('  Got CSRF token as plain string');
    return trimmed;
  }
  // Fall back to parsing HTML for a hidden input
  const token = getRequestVerificationTokenFromBody(body);
  if (token) return token;

  // Fallback: extract token from /Home page HTML (works when the endpoint returns empty)
  logger.debug('  CSRFToken endpoint returned no token (length:', body.length, '), trying /Home page fallback');
  try {
    const homeRes = await mychartRequest.makeRequest({ path: '/Home' });
    const homeBody = await homeRes.text();
    const homeToken = getRequestVerificationTokenFromBody(homeBody);
    if (homeToken) {
      logger.debug('  Got CSRF token from /Home page fallback');
      return homeToken;
    }
    logger.debug('  Could not extract CSRF token from /Home page either');
  } catch (err) {
    logger.debug('  /Home page fallback failed:', err);
  }
  return null;
}

function fail(error: string): SetupTotpResult {
  return { secret: null, error };
}

/**
 * Set up TOTP authenticator app on a MyChart account.
 *
 * Flow (discovered via Playwright on a MyChart instance):
 * 1. POST /api/secondary-validation/GetTwoFactorInfo — check current 2FA settings
 * 2. POST /api/secondary-validation/VerifyPasswordAndUpdateContact — verify password
 * 3. POST /api/secondary-validation/TotpQrCode — get QR code data with secret
 * 4. POST /api/secondary-validation/VerifyCode — verify setup with generated code
 * 5. POST /api/secondary-validation/UpdateTwoFactorTotpOptInStatus — finalize opt-in
 *
 * Returns the TOTP secret if setup succeeds, or null with an error message if it fails.
 */
export async function setupTotp(mychartRequest: MyChartRequest, password: string): Promise<SetupTotpResult> {

  // Get CSRF token for API requests
  const csrfToken = await getCSRFToken(mychartRequest);
  if (!csrfToken) {
    logger.debug('  Could not get CSRF token.');
    return fail('Could not get CSRF token. The session may have expired.');
  }

  const apiHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    '__RequestVerificationToken': csrfToken,
  };

  // Step 1: Check current 2FA settings
  logger.debug('  Checking current 2FA settings...');
  const twoFactorInfoResp = await mychartRequest.makeRequest({
    path: '/api/secondary-validation/GetTwoFactorInfo',
    method: 'POST',
    headers: apiHeaders,
    body: '{}',
  });
  if (twoFactorInfoResp.status !== 200) {
    logUnexpectedResponse('GetTwoFactorInfo', twoFactorInfoResp);
    const body = await twoFactorInfoResp.text();
    logger.debug('  GetTwoFactorInfo unexpected response body:', body);
    if (twoFactorInfoResp.status === 500) {
      return fail('This MyChart instance does not support authenticator app setup. You can still use SMS/email 2FA codes.');
    }
    return fail(`Failed to check 2FA settings (HTTP ${twoFactorInfoResp.status}). The session may have expired.`);
  }
  const twoFactorInfo = await twoFactorInfoResp.json();
  logger.debug('  2FA info:', JSON.stringify(twoFactorInfo));

  // Check if TOTP is already enabled
  if (twoFactorInfo.IsTotpEnabled || twoFactorInfo.isTotpEnabled) {
    logger.debug('  TOTP authenticator app is already enabled on this account.');
    logger.debug('  To get the secret, you need to disable and re-enable TOTP in MyChart settings.');
    return fail('TOTP is already enabled on this MyChart account. To re-configure, disable it in MyChart settings first.');
  }

  // Step 2: Verify password
  logger.debug('  Verifying password...');
  const verifyResp = await mychartRequest.makeRequest({
    path: '/api/secondary-validation/VerifyPasswordAndUpdateContact',
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({ Password: password }),
  });
  if (verifyResp.status !== 200) {
    logUnexpectedResponse('VerifyPasswordAndUpdateContact', verifyResp);
    const body = await verifyResp.text();
    logger.debug('  VerifyPasswordAndUpdateContact unexpected response body:', body);
    return fail(`Password verification failed (HTTP ${verifyResp.status}).`);
  }
  const verifyResult = await verifyResp.json();
  logger.debug('  VerifyPassword result:', JSON.stringify(verifyResult));

  if (verifyResult.IsPasswordValid === false || verifyResult.isPasswordValid === false) {
    logger.debug('  Password verification failed.');
    return fail('Password verification failed. The saved password may be incorrect.');
  }
  logger.debug('  Password verified.');

  // Step 3: Get QR code / TOTP secret
  logger.debug('  Requesting TOTP setup...');
  const qrResp = await mychartRequest.makeRequest({
    path: '/api/secondary-validation/TotpQrCode',
    method: 'POST',
    headers: apiHeaders,
    body: '{}',
  });
  if (qrResp.status !== 200) {
    logUnexpectedResponse('TotpQrCode', qrResp);
    const body = await qrResp.text();
    logger.debug('  TotpQrCode unexpected response body:', body);
    return fail(`Failed to get TOTP QR code (HTTP ${qrResp.status}).`);
  }
  const qrResult = await qrResp.json();
  logger.debug('  TotpQrCode response keys:', Object.keys(qrResult).join(', '));

  // The secret key may be in various fields depending on the MyChart version
  const secret = qrResult.encodedSecretKey || qrResult.EncodedSecretKey || qrResult.SecretKey || qrResult.secretKey || qrResult.Secret || qrResult.secret || qrResult.ManualEntryKey || qrResult.manualEntryKey;

  if (!secret) {
    logger.debug('  Could not extract TOTP secret from response:', JSON.stringify(qrResult));
    return fail('Could not extract TOTP secret from server response.');
  }

  logger.debug('  Got TOTP secret (length:', secret.length, ')');

  // Step 4: Verify the setup by generating and submitting a TOTP code
  logger.debug('  Verifying TOTP setup...');
  const code = await generateTotpCode(secret);
  logger.debug('  Generated verification code:', code);

  const verifyTotpResp = await mychartRequest.makeRequest({
    path: '/api/secondary-validation/VerifyCode',
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({ Code: code }),
  });
  const verifyTotpText = await verifyTotpResp.text();
  logger.debug('  VerifyCode response status:', verifyTotpResp.status, 'body:', verifyTotpText);

  if (verifyTotpResp.status !== 200) {
    logger.debug('  TOTP code verification failed.');
    return fail(`TOTP code verification failed (HTTP ${verifyTotpResp.status}).`);
  }

  // Step 5: Finalize the opt-in
  logger.debug('  Finalizing TOTP opt-in...');
  const optInResp = await mychartRequest.makeRequest({
    path: '/api/secondary-validation/UpdateTwoFactorTotpOptInStatus',
    method: 'POST',
    headers: apiHeaders,
    body: '{}',
  });
  logger.debug('  OptIn response status:', optInResp.status);

  if (optInResp.status !== 200) {
    logUnexpectedResponse('UpdateTwoFactorTotpOptInStatus', optInResp);
    const body = await optInResp.text();
    logger.debug('  UpdateTwoFactorTotpOptInStatus unexpected response body:', body);
    return fail(`Failed to finalize TOTP opt-in (HTTP ${optInResp.status}).`);
  }

  logger.debug('  TOTP setup complete! Authenticator app is now enabled.');
  return { secret };
}

/**
 * Disable TOTP authenticator app on a MyChart account.
 *
 * Flow:
 * 1. POST /api/secondary-validation/VerifyPasswordAndUpdateContact — verify password
 * 2. POST /api/secondary-validation/VerifyCode — verify with current TOTP code
 * 3. POST /api/secondary-validation/UpdateTwoFactorTotpOptInStatus — finalize opt-out
 */
export async function disableTotp(mychartRequest: MyChartRequest, password: string, totpSecret: string): Promise<boolean> {
  const csrfToken = await getCSRFToken(mychartRequest);
  if (!csrfToken) {
    logger.debug('  Could not get CSRF token.');
    return false;
  }

  const apiHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    '__RequestVerificationToken': csrfToken,
  };

  // Step 1: Verify password
  logger.debug('  Verifying password...');
  const verifyResp = await mychartRequest.makeRequest({
    path: '/api/secondary-validation/VerifyPasswordAndUpdateContact',
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({ Password: password }),
  });
  const verifyResult = await verifyResp.json();

  if (verifyResult.IsPasswordValid === false || verifyResult.isPasswordValid === false) {
    logger.debug('  Password verification failed.');
    return false;
  }
  logger.debug('  Password verified.');

  // Step 2: Verify with current TOTP code
  logger.debug('  Generating TOTP code for verification...');
  const code = await generateTotpCode(totpSecret);
  logger.debug('  Generated code:', code);

  const verifyCodeResp = await mychartRequest.makeRequest({
    path: '/api/secondary-validation/VerifyCode',
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({ Code: code }),
  });

  if (verifyCodeResp.status !== 200) {
    logger.debug('  TOTP code verification failed (status:', verifyCodeResp.status, ')');
    return false;
  }

  // Step 3: Finalize opt-out
  logger.debug('  Disabling TOTP...');
  const optOutResp = await mychartRequest.makeRequest({
    path: '/api/secondary-validation/UpdateTwoFactorTotpOptInStatus',
    method: 'POST',
    headers: apiHeaders,
    body: '{}',
  });
  logger.debug('  OptOut response status:', optOutResp.status);

  logger.debug('  TOTP disabled! Authenticator app has been removed.');
  return true;
}
