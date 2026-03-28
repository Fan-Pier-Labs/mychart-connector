import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { getPoolOptions, getBetterAuthSecret, getGoogleOAuthCredentials, hasGoogleOAuth, getResendApiKey } from './mcp/config';
import { nextCookies } from 'better-auth/next-js';
import { twoFactor } from 'better-auth/plugins/two-factor';
import { magicLink } from 'better-auth/plugins/magic-link';
import { passkey } from '@better-auth/passkey';
import { Resend } from 'resend';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let authInstance: any = null;
let poolInstance: Pool | null = null;

async function getPool(): Promise<Pool> {
  if (poolInstance) return poolInstance;
  const opts = await getPoolOptions();
  poolInstance = new Pool(opts);
  return poolInstance;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAuth(): Promise<any> {
  if (authInstance) return authInstance;

  const pool = await getPool();
  console.log('[Auth] Loading secrets...');

  const useGoogle = hasGoogleOAuth();
  const [secret, googleOAuth] = await Promise.all([
    getBetterAuthSecret(),
    useGoogle ? getGoogleOAuthCredentials() : Promise.resolve(null),
  ]);
  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : undefined;
  const baseURL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || railwayDomain || `http://localhost:${process.env.PORT || 3000}`;
  if (useGoogle && googleOAuth) {
    console.log('[Auth] Secrets loaded. Google clientId:', googleOAuth.clientId.slice(0, 20) + '...', 'baseURL:', baseURL);
  } else {
    console.log('[Auth] Secrets loaded. Google OAuth: disabled. baseURL:', baseURL);
  }

  // Build trusted origins list, always including the base URL
  const trustedOrigins = ['http://localhost:2343', 'http://localhost:3000', 'https://mychartscrapers-staging.fanpierlabs.com', 'https://openrecord.fanpierlabs.com', 'https://mychart.fanpierlabs.com'];
  if (baseURL && !trustedOrigins.includes(baseURL)) {
    trustedOrigins.push(baseURL);
  }
  // Allow additional trusted origins via env var (comma-separated)
  if (process.env.TRUSTED_ORIGINS) {
    for (const origin of process.env.TRUSTED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)) {
      if (!trustedOrigins.includes(origin)) {
        trustedOrigins.push(origin);
      }
    }
  }

  authInstance = betterAuth({
    database: pool,
    baseURL,
    trustedOrigins,
    secret,
    emailAndPassword: {
      enabled: true,
    },
    ...(useGoogle && googleOAuth
      ? {
          socialProviders: {
            google: {
              clientId: googleOAuth.clientId,
              clientSecret: googleOAuth.clientSecret,
            },
          },
        }
      : {}),
    plugins: [
      nextCookies(),
      twoFactor({
        issuer: 'MyChart MCP',
      }),
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          const apiKey = await getResendApiKey();
          const resend = new Resend(apiKey);
          const { error } = await resend.emails.send({
            from: 'MyChart MCP <notifications@fanpierlabs.com>',
            to: email,
            subject: 'Sign in to MyChart Connector',
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                <h2 style="font-size: 24px; font-weight: 600; color: #1a1a24; margin-bottom: 8px;">Sign in to MyChart Connector</h2>
                <p style="color: #5a5a6a; font-size: 16px; line-height: 1.5; margin-bottom: 32px;">Click the button below to sign in. This link expires in 10 minutes.</p>
                <a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 9999px; font-weight: 500; font-size: 16px;">Sign in</a>
                <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">If you didn't request this email, you can safely ignore it.</p>
              </div>
            `,
          });
          if (error) {
            throw new Error(`Failed to send magic link email: ${error.message}`);
          }
        },
      }),
      passkey({
        rpID: new URL(baseURL).hostname,
        rpName: 'MyChart MCP',
        origin: baseURL,
      }),
    ],
  });

  return authInstance;
}
