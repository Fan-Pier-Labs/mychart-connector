import type { MyChartInstance } from '@/lib/db';
import { myChartUserPassLogin, complete2faFlow, type TwoFaDeliveryInfo } from '@/lib/mychart/login';
import { setSession } from '@/lib/sessions';
import { sessionStore } from '../../../../scrapers/myChart/sessionStore';

export type AutoConnectResult = {
  state: 'logged_in' | 'need_2fa' | 'error';
  twoFaDelivery?: TwoFaDeliveryInfo;
};

/**
 * Auto-connect a MyChart instance. Logs in with stored credentials and
 * auto-completes 2FA if a TOTP secret is available.
 *
 * Returns the login state and optional 2FA delivery info.
 */
export async function autoConnectInstance(
  userId: string,
  instance: MyChartInstance
): Promise<AutoConnectResult> {
  const sessionKey = `${userId}:${instance.id}`;

  // Check if already connected with a valid logged_in session
  const existing = sessionStore.getEntry(sessionKey);
  if (existing && existing.status === 'logged_in') {
    console.log(`[auto-connect] ${instance.hostname}: already logged_in, reusing session`);
    return { state: 'logged_in' };
  }

  // If 2FA is pending, preserve the session — the user must call complete_2fa, not restart
  if (existing?.status === 'need_2fa') {
    console.log(`[auto-connect] ${instance.hostname}: pending 2FA — preserving session, not re-logging in`);
    return { state: 'need_2fa' };
  }

  // Clear expired/error sessions before re-login
  if (existing) {
    console.log(`[auto-connect] ${instance.hostname}: clearing stale session (status=${existing.status})`);
    sessionStore.delete(sessionKey);
  }

  console.log(`[auto-connect] ${instance.hostname}: logging in as ${instance.username}`);
  let loginResult;
  try {
    loginResult = await myChartUserPassLogin({
      hostname: instance.hostname,
      user: instance.username,
      pass: instance.password,
      skipSendCode: !!instance.totpSecret,
    });
  } catch (err) {
    const error = err as Error;
    console.error(`[auto-connect] ${instance.hostname}: login threw error - ${error.message}`, error.stack);
    return { state: 'error' };
  }

  console.log(`[auto-connect] ${instance.hostname}: login result state=${loginResult.state}`);

  if (loginResult.state === 'invalid_login' || loginResult.state === 'error') {
    console.log(`[auto-connect] ${instance.hostname}: login failed with state=${loginResult.state}`);
    return { state: 'error' };
  }

  if (loginResult.state === 'need_2fa') {
    if (instance.totpSecret) {
      console.log(`[auto-connect] ${instance.hostname}: need_2fa, auto-completing with TOTP`);
      try {
        const { generateTotpCode } = await import('@/lib/mychart/totp');
        const code = await generateTotpCode(instance.totpSecret);
        console.log(`[auto-connect] ${instance.hostname}: generated TOTP code, submitting 2FA`);
        const twofaResult = await complete2faFlow({
          mychartRequest: loginResult.mychartRequest,
          code,
          isTOTP: true,
        });

        console.log(`[auto-connect] ${instance.hostname}: 2FA result state=${twofaResult.state}`);
        if (twofaResult.state === 'logged_in') {
          setSession(sessionKey, twofaResult.mychartRequest, { hostname: instance.hostname });
          return { state: 'logged_in' };
        }

        console.log(`[auto-connect] ${instance.hostname}: TOTP auto-2FA failed with state=${twofaResult.state}`);
        return { state: 'error' };
      } catch (err) {
        const error = err as Error;
        console.error(`[auto-connect] ${instance.hostname}: TOTP 2FA threw error - ${error.message}`, error.stack);
        return { state: 'error' };
      }
    }

    // No TOTP secret — store partial session with need_2fa status
    console.log(`[auto-connect] ${instance.hostname}: need_2fa but no TOTP secret, storing partial session`);
    sessionStore.set(sessionKey, loginResult.mychartRequest, {
      hostname: instance.hostname,
      status: 'need_2fa',
    });
    return { state: 'need_2fa', twoFaDelivery: loginResult.twoFaDelivery };
  }

  // Logged in directly (no 2FA needed)
  console.log(`[auto-connect] ${instance.hostname}: logged in directly (no 2FA)`);
  setSession(sessionKey, loginResult.mychartRequest, { hostname: instance.hostname });
  return { state: 'logged_in' };
}
