import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { RDS_CA_BUNDLE } from '../rds-ca-bundle';

const RDS_PORT = 5432;
const RDS_CONNECTION_INFO_SECRET_ARN = 'arn:aws:secretsmanager:us-east-2:555985150976:secret:RDS_CONNECTION_INFO-vSoq60';
const RDS_PASSWORD_SECRET_ARN = 'arn:aws:secretsmanager:us-east-2:555985150976:secret:rds!db-e8257e96-5388-431e-84fe-828624f5ae16-VAxdIu';
const MCP_ENCRYPTION_KEY_SECRET_ARN = 'arn:aws:secretsmanager:us-east-2:555985150976:secret:MCP_ENCRYPTION_KEY-7dAfwd';
const BETTER_AUTH_SECRET_ARN = 'arn:aws:secretsmanager:us-east-2:555985150976:secret:BETTER_AUTH_SECRET-ViBKHZ';
const GOOGLE_OAUTH_SECRET_ARN = 'arn:aws:secretsmanager:us-east-2:555985150976:secret:GOOGLE_OAUTH_CREDENTIALS-XtqYdp';
const RESEND_API_KEY_SECRET_ARN = 'arn:aws:secretsmanager:us-east-2:555985150976:secret:RESEND_API_KEY-vKJonO';

const AWS_REGION = 'us-east-2';

/**
 * Returns true if running in env-var mode (Railway / self-hosted).
 * When DATABASE_URL is set, all config comes from env vars instead of AWS Secrets Manager.
 */
function isEnvVarMode(): boolean {
  return !!process.env.DATABASE_URL;
}

let _smClient: SecretsManagerClient | null = null;
function getSmClient(): SecretsManagerClient {
  if (!_smClient) {
    _smClient = new SecretsManagerClient({
      region: AWS_REGION,
      // Use fanpierlabs profile for local dev; in Fargate the task role provides creds automatically
      ...(process.env.NODE_ENV === 'development' ? { profile: 'fanpierlabs' } : {}),
    });
  }
  return _smClient;
}

// Cache resolved secrets in memory
let cachedRdsConnectionInfo: { host: string; user: string; database: string } | null = null;
let cachedDbPassword: string | null = null;
let cachedEncryptionKey: string | null = null;
let cachedBetterAuthSecret: string | null = null;
let cachedGoogleOAuth: { clientId: string; clientSecret: string } | null = null;
let cachedResendApiKey: string | null = null;

async function getSecretValue(arn: string): Promise<string> {
  const resp = await getSmClient().send(new GetSecretValueCommand({ SecretId: arn }));
  if (!resp.SecretString) throw new Error(`Secret ${arn} has no string value`);
  return resp.SecretString;
}

async function getRdsConnectionInfo(): Promise<{ host: string; user: string; database: string }> {
  if (cachedRdsConnectionInfo) return cachedRdsConnectionInfo;
  const raw = await getSecretValue(RDS_CONNECTION_INFO_SECRET_ARN);
  const parsed = JSON.parse(raw);
  cachedRdsConnectionInfo = { host: parsed.host, user: parsed.user, database: parsed.database };
  return cachedRdsConnectionInfo;
}

export async function getRdsPassword(): Promise<string> {
  if (cachedDbPassword) return cachedDbPassword;
  const raw = await getSecretValue(RDS_PASSWORD_SECRET_ARN);
  // RDS-managed secrets are JSON: {"username":"postgres","password":"..."}
  try {
    const parsed = JSON.parse(raw);
    cachedDbPassword = parsed.password;
  } catch {
    cachedDbPassword = raw;
  }
  return cachedDbPassword!;
}

export async function getEncryptionKey(): Promise<string> {
  if (isEnvVarMode()) {
    if (!process.env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY env var is required');
    return process.env.ENCRYPTION_KEY;
  }
  if (cachedEncryptionKey) return cachedEncryptionKey;
  cachedEncryptionKey = await getSecretValue(MCP_ENCRYPTION_KEY_SECRET_ARN);
  return cachedEncryptionKey;
}

export async function getBetterAuthSecret(): Promise<string> {
  if (isEnvVarMode()) {
    if (!process.env.BETTER_AUTH_SECRET) throw new Error('BETTER_AUTH_SECRET env var is required');
    return process.env.BETTER_AUTH_SECRET;
  }
  if (cachedBetterAuthSecret) return cachedBetterAuthSecret;
  cachedBetterAuthSecret = await getSecretValue(BETTER_AUTH_SECRET_ARN);
  return cachedBetterAuthSecret;
}

export async function getGoogleOAuthCredentials(): Promise<{ clientId: string; clientSecret: string }> {
  if (isEnvVarMode()) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars are required');
    return { clientId, clientSecret };
  }
  if (cachedGoogleOAuth) return cachedGoogleOAuth;
  const raw = await getSecretValue(GOOGLE_OAUTH_SECRET_ARN);
  const parsed = JSON.parse(raw);
  cachedGoogleOAuth = { clientId: parsed.client_id, clientSecret: parsed.client_secret };
  return cachedGoogleOAuth;
}

/**
 * Returns true if Google OAuth credentials are available (either via env vars or AWS).
 * In env-var mode, checks if both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.
 * In AWS mode, always returns true (credentials are always in Secrets Manager).
 */
export function hasGoogleOAuth(): boolean {
  if (isEnvVarMode()) {
    return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
  }
  return true;
}

export async function getDatabaseUrl(): Promise<string> {
  if (isEnvVarMode()) {
    return process.env.DATABASE_URL!;
  }
  const [{ host, user, database }, password] = await Promise.all([
    getRdsConnectionInfo(),
    getRdsPassword(),
  ]);
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${RDS_PORT}/${database}`;
}

function getRdsCaBundle(): string {
  return RDS_CA_BUNDLE;
}

/**
 * Returns pool connection options with appropriate SSL config.
 * - AWS RDS: SSL with full certificate verification using the committed CA bundle.
 * - Railway / self-hosted: SSL with rejectUnauthorized: false (self-signed certs).
 * - Set DB_SSL=false to disable SSL entirely (e.g. local dev with a plain Postgres container).
 */
export async function getPoolOptions(): Promise<{ connectionString: string; ssl: false | { rejectUnauthorized: boolean; ca?: string } }> {
  const connectionString = await getDatabaseUrl();
  if (!isEnvVarMode()) {
    // AWS RDS: full cert verification against the RDS CA bundle
    return { connectionString, ssl: { rejectUnauthorized: true, ca: getRdsCaBundle() } };
  }
  const sslDisabled = process.env.DB_SSL === 'false';
  return {
    connectionString,
    ssl: sslDisabled ? false : { rejectUnauthorized: false },
  };
}

export async function getResendApiKey(): Promise<string> {
  if (cachedResendApiKey) return cachedResendApiKey;
  if (process.env.RESEND_API_KEY) {
    cachedResendApiKey = process.env.RESEND_API_KEY;
    return cachedResendApiKey;
  }
  cachedResendApiKey = await getSecretValue(RESEND_API_KEY_SECRET_ARN);
  return cachedResendApiKey;
}
