import { execSync } from 'child_process';

const RESEND_API_KEY_SECRET_ARN = 'arn:aws:secretsmanager:us-east-2:555985150976:secret:RESEND_API_KEY-vKJonO';

let cachedApiKey: string | null = null;

async function getResendApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;
  const result = execSync(
    `aws secretsmanager get-secret-value --secret-id "${RESEND_API_KEY_SECRET_ARN}" --region us-east-2 --profile fanpierlabs --query SecretString --output text`,
    { encoding: 'utf-8' }
  ).trim();
  cachedApiKey = result;
  return result;
}

interface ResendEmail {
  id: string;
  to: string[];
  from: string;
  created_at: string;
  subject: string;
}

interface ResendEmailDetail {
  id: string;
  from: string;
  subject: string;
  text: string | null;
  html: string | null;
  created_at: string;
}

/**
 * Poll Resend inbound emails for a 2FA code sent after `minTime`.
 * Matches emails by hostname (from domain).
 * Returns an array of {code, score} sorted by confidence, or empty if none found.
 */
export async function get2FaFromResend(
  minTime: number,
  hostname: string
): Promise<{ code: string; score: number }[]> {
  const apiKey = await getResendApiKey();

  const hostDomainParts = hostname.split('.').slice(-2).join('.');

  for (let attempt = 0; attempt < 60; attempt++) {
    const listRes = await fetch('https://api.resend.com/emails/receiving?limit=10', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!listRes.ok) {
      console.log(`  Resend API error: ${listRes.status} ${listRes.statusText}`);
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }

    const listData = (await listRes.json()) as { data: ResendEmail[] };

    for (const email of listData.data) {
      const emailTime = new Date(email.created_at).getTime();
      if (emailTime < minTime) continue;

      // Check if the email is from the right domain
      const fromDomain = email.from.split('@')[1]?.toLowerCase();
      const fromDomainParts = fromDomain?.split('.').slice(-2).join('.');
      if (fromDomainParts !== hostDomainParts) continue;

      // Fetch the full email to get the body
      const detailRes = await fetch(`https://api.resend.com/emails/receiving/${email.id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!detailRes.ok) continue;

      const detail = (await detailRes.json()) as ResendEmailDetail;
      const body = detail.text || detail.html || '';
      const codeMatch = body.match(/(\d{6})/);
      if (codeMatch) {
        console.log(`  Found 2FA code from Resend (email: ${email.subject})`);
        return [{ code: codeMatch[1], score: 1 }];
      }
    }

    if (attempt === 0) {
      console.log('  Waiting for 2FA email to arrive via Resend...');
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('  No 2FA email found via Resend after 2 minutes.');
  return [];
}
