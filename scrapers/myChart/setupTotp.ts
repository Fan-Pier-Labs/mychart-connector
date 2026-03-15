import { MyChartRequest } from './myChartRequest';
import { getRequestVerificationTokenFromBody } from './util';
import { generateTotpCode } from './totp';

function logUnexpectedResponse(label: string, resp: Response) {
  console.log(`  ${label} unexpected status: ${resp.status}`);
  console.log(`  ${label} response headers:`, Object.fromEntries(resp.headers.entries()));
}

/**
 * Get a CSRF token required for MyChart API endpoints.
 */
async function getCSRFToken(mychartRequest: MyChartRequest): Promise<string | null> {
  const res = await mychartRequest.makeRequest({
    path: '/Home/CSRFToken?noCache=' + Math.random(),
  });
  const body = await res.text();
  // If we landed on the T&C page instead of getting a CSRF token, that's a problem
  if (body.toLowerCase().includes('termsconditions') || body.toLowerCase().includes('terms and conditions')) {
    console.log('  CSRF token request landed on Terms & Conditions page');
    return null;
  }
  const token = getRequestVerificationTokenFromBody(body);
  return token || null;
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
 * Returns the TOTP secret if setup succeeds, or null if it fails.
 */
export async function setupTotp(mychartRequest: MyChartRequest, password: string): Promise<string | null> {

  // Get CSRF token for API requests
  const csrfToken = await getCSRFToken(mychartRequest);
  if (!csrfToken) {
    console.log('  Could not get CSRF token.');
    return null;
  }

  const apiHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    '__RequestVerificationToken': csrfToken,
  };

  // Step 1: Check current 2FA settings
  console.log('  Checking current 2FA settings...');
  const twoFactorInfoResp = await mychartRequest.makeRequest({
    path: '/api/secondary-validation/GetTwoFactorInfo',
    method: 'POST',
    headers: apiHeaders,
    body: '{}',
  });
  if (twoFactorInfoResp.status !== 200) {
    logUnexpectedResponse('GetTwoFactorInfo', twoFactorInfoResp);
    const body = await twoFactorInfoResp.text();
    console.log('  GetTwoFactorInfo unexpected response body:', body);
    return null;
  }
  const twoFactorInfo = await twoFactorInfoResp.json();
  console.log('  2FA info:', JSON.stringify(twoFactorInfo));

  // Check if TOTP is already enabled
  if (twoFactorInfo.IsTotpEnabled || twoFactorInfo.isTotpEnabled) {
    console.log('  TOTP authenticator app is already enabled on this account.');
    console.log('  To get the secret, you need to disable and re-enable TOTP in MyChart settings.');
    return null;
  }

  // Step 2: Verify password
  console.log('  Verifying password...');
  const verifyResp = await mychartRequest.makeRequest({
    path: '/api/secondary-validation/VerifyPasswordAndUpdateContact',
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({ Password: password }),
  });
  if (verifyResp.status !== 200) {
    logUnexpectedResponse('VerifyPasswordAndUpdateContact', verifyResp);
    const body = await verifyResp.text();
    console.log('  VerifyPasswordAndUpdateContact unexpected response body:', body);
    return null;
  }
  const verifyResult = await verifyResp.json();

  if (verifyResult.IsPasswordValid === false || verifyResult.isPasswordValid === false) {
    console.log('  Password verification failed.');
    return null;
  }
  console.log('  Password verified.');

  // Step 3: Get QR code / TOTP secret
  console.log('  Requesting TOTP setup...');
  const qrResp = await mychartRequest.makeRequest({
    path: '/api/secondary-validation/TotpQrCode',
    method: 'POST',
    headers: apiHeaders,
    body: '{}',
  });
  if (qrResp.status !== 200) {
    logUnexpectedResponse('TotpQrCode', qrResp);
    const body = await qrResp.text();
    console.log('  TotpQrCode unexpected response body:', body);
    return null;
  }
  const qrResult = await qrResp.json();

  // The secret key may be in various fields depending on the MyChart version
  const secret = qrResult.encodedSecretKey || qrResult.EncodedSecretKey || qrResult.SecretKey || qrResult.secretKey || qrResult.Secret || qrResult.secret || qrResult.ManualEntryKey || qrResult.manualEntryKey;

  if (!secret) {
    console.log('  Could not extract TOTP secret from response:', JSON.stringify(qrResult));
    return null;
  }

  console.log('  Got TOTP secret (length:', secret.length, ')');

  // Step 4: Verify the setup by generating and submitting a TOTP code
  console.log('  Verifying TOTP setup...');
  const code = await generateTotpCode(secret);
  console.log('  Generated verification code:', code);

  const verifyTotpResp = await mychartRequest.makeRequest({
    path: '/api/secondary-validation/VerifyCode',
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({ Code: code }),
  });
  const verifyTotpText = await verifyTotpResp.text();
  console.log('  VerifyCode response status:', verifyTotpResp.status, 'body:', verifyTotpText);

  if (verifyTotpResp.status !== 200) {
    console.log('  TOTP code verification failed.');
    return null;
  }

  // Step 5: Finalize the opt-in
  console.log('  Finalizing TOTP opt-in...');
  const optInResp = await mychartRequest.makeRequest({
    path: '/api/secondary-validation/UpdateTwoFactorTotpOptInStatus',
    method: 'POST',
    headers: apiHeaders,
    body: '{}',
  });
  console.log('  OptIn response status:', optInResp.status);

  console.log('  TOTP setup complete! Authenticator app is now enabled.');
  return secret;
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
    console.log('  Could not get CSRF token.');
    return false;
  }

  const apiHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    '__RequestVerificationToken': csrfToken,
  };

  // Step 1: Verify password
  console.log('  Verifying password...');
  const verifyResp = await mychartRequest.makeRequest({
    path: '/api/secondary-validation/VerifyPasswordAndUpdateContact',
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({ Password: password }),
  });
  const verifyResult = await verifyResp.json();

  if (verifyResult.IsPasswordValid === false || verifyResult.isPasswordValid === false) {
    console.log('  Password verification failed.');
    return false;
  }
  console.log('  Password verified.');

  // Step 2: Verify with current TOTP code
  console.log('  Generating TOTP code for verification...');
  const code = await generateTotpCode(totpSecret);
  console.log('  Generated code:', code);

  const verifyCodeResp = await mychartRequest.makeRequest({
    path: '/api/secondary-validation/VerifyCode',
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({ Code: code }),
  });

  if (verifyCodeResp.status !== 200) {
    console.log('  TOTP code verification failed (status:', verifyCodeResp.status, ')');
    return false;
  }

  // Step 3: Finalize opt-out
  console.log('  Disabling TOTP...');
  const optOutResp = await mychartRequest.makeRequest({
    path: '/api/secondary-validation/UpdateTwoFactorTotpOptInStatus',
    method: 'POST',
    headers: apiHeaders,
    body: '{}',
  });
  console.log('  OptOut response status:', optOutResp.status);

  console.log('  TOTP disabled! Authenticator app has been removed.');
  return true;
}
