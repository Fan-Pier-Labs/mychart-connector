import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { getDatabaseUrl, getBetterAuthSecret, getGoogleOAuthCredentials } from './mcp/config';
import { nextCookies } from 'better-auth/next-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let authInstance: any = null;
let poolInstance: Pool | null = null;

async function getPool(): Promise<Pool> {
  if (poolInstance) return poolInstance;
  const url = await getDatabaseUrl();
  poolInstance = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  return poolInstance;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAuth(): Promise<any> {
  if (authInstance) return authInstance;

  const pool = await getPool();
  console.log('[Auth] Loading secrets...');
  const [secret, googleOAuth] = await Promise.all([
    getBetterAuthSecret(),
    getGoogleOAuthCredentials(),
  ]);
  const baseURL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  console.log('[Auth] Secrets loaded. Google clientId:', googleOAuth.clientId.slice(0, 20) + '...', 'baseURL:', baseURL);

  authInstance = betterAuth({
    database: pool,
    baseURL,
    trustedOrigins: ['http://localhost:2343', 'http://localhost:3000', 'https://mychart.fanpierlabs.com'],
    secret,
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      google: {
        clientId: googleOAuth.clientId,
        clientSecret: googleOAuth.clientSecret,
      },
    },
    plugins: [nextCookies()],
  });

  return authInstance;
}
