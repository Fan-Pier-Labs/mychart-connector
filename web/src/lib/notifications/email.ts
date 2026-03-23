import { Resend } from 'resend';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { EmailContent } from './templates';

const RESEND_API_KEY_SECRET_ARN = 'arn:aws:secretsmanager:us-east-2:555985150976:secret:RESEND_API_KEY-vKJonO';

const secretsClient = new SecretsManagerClient({
  region: 'us-east-2',
  ...(process.env.NODE_ENV === 'development' ? { profile: 'fanpierlabs' } : {}),
});

let cachedResendApiKey: string | null = null;

async function getResendApiKey(): Promise<string> {
  if (cachedResendApiKey) return cachedResendApiKey;
  const resp = await secretsClient.send(new GetSecretValueCommand({ SecretId: RESEND_API_KEY_SECRET_ARN }));
  if (!resp.SecretString) throw new Error('RESEND_API_KEY secret has no string value');
  cachedResendApiKey = resp.SecretString;
  return cachedResendApiKey;
}

/**
 * Send a notification email via Resend.
 */
export async function sendNotificationEmail(
  to: string,
  email: EmailContent
): Promise<void> {
  const apiKey = await getResendApiKey();
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: 'MyChart MCP <notifications@fanpierlabs.com>',
    to,
    subject: email.subject,
    html: email.html,
    attachments: email.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });

  if (error) {
    throw new Error(`Resend send error: ${error.message}`);
  }
}
