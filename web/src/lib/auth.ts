import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getBetterAuthSecret, getGoogleOAuthCredentials, hasGoogleOAuth } from './mcp/config';
import { getDb } from './drizzle';
import { nextCookies } from 'better-auth/next-js';
import { twoFactor } from 'better-auth/plugins/two-factor';
import { passkey } from '@better-auth/passkey';
import * as schema from './schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let authInstance: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAuth(): Promise<any> {
  if (authInstance) return authInstance;

  const db = await getDb();
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
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema,
    }),
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
      passkey({
        rpID: new URL(baseURL).hostname,
        rpName: 'MyChart MCP',
        origin: baseURL,
      }),
    ],
  });

  return authInstance;
}
