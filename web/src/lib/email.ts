import { Resend } from 'resend';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const RESEND_API_KEY_SECRET_ARN = 'arn:aws:secretsmanager:us-east-2:555985150976:secret:RESEND_API_KEY-vKJonO';

const secretsClient = new SecretsManagerClient({
  region: 'us-east-2',
  ...(process.env.NODE_ENV === 'development' ? { profile: 'fanpierlabs' } : {}),
});

let cachedResendApiKey: string | null = null;

async function getResendApiKey(): Promise<string> {
  // Check env var first (Railway / self-hosted), then fall back to AWS Secrets Manager
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY;
  if (cachedResendApiKey) return cachedResendApiKey;
  const resp = await secretsClient.send(new GetSecretValueCommand({ SecretId: RESEND_API_KEY_SECRET_ARN }));
  if (!resp.SecretString) throw new Error('RESEND_API_KEY secret has no string value');
  cachedResendApiKey = resp.SecretString;
  return cachedResendApiKey;
}

let cachedResend: Resend | null = null;

async function getResend(): Promise<Resend> {
  if (cachedResend) return cachedResend;
  const apiKey = await getResendApiKey();
  cachedResend = new Resend(apiKey);
  return cachedResend;
}

const FROM_ADDRESS = 'OpenRecord <noreply@emails.fanpierlabs.com>';

/**
 * Send a transactional email (password reset, etc.) via Resend.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const resend = await getResend();
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  if (error) {
    throw new Error(`Resend send error: ${error.message}`);
  }
}
