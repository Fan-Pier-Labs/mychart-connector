import { Resend } from 'resend';
import * as cheerio from 'cheerio';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

type CodeArray = {
  code: string;
  score: number;
  emailTimestamp: number;
}[];

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

function scoreEmail(fromAddress: string, htmlBody: string, hostname: string): number {
  const fromDomain = fromAddress.replace(/.*@/, '').replace(/[<>]/g, '').trim();

  // Exact domain match
  if (fromDomain === hostname) {
    return 0.99;
  }

  // Last two parts match (e.g. "bmc.org")
  const fromParts = fromDomain.split('.').slice(-2).join('.');
  const hostParts = hostname.split('.').slice(-2).join('.');
  if (fromParts === hostParts) {
    return 0.95;
  }

  // HTML body contains a link to the hostname
  if (htmlBody) {
    const $ = cheerio.load(htmlBody);
    const links = $('a').map((_, el) => $(el).attr('href')).get();
    for (const link of links) {
      if (!link.trim() || link.trim() === '#') continue;
      try {
        const linkUrl = new URL(link);
        if (linkUrl.hostname === hostname) {
          return 0.80;
        }
      } catch {
        // ignore invalid links
      }
    }
  }

  return 0.10;
}

export async function get2FaCodeFromResend(minTime: number, hostname: string, codePattern: RegExp = /(\d{6})/): Promise<CodeArray> {
  const apiKey = await getResendApiKey();
  const resend = new Resend(apiKey);
  const cutoff = minTime - 5000;

  for (let attempt = 0; attempt < 60; attempt++) {
    const { data: listData, error: listError } = await resend.emails.receiving.list();

    if (listError) {
      console.log(`  Resend list error: ${listError.message}`);
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    if (!listData?.data || listData.data.length === 0) {
      console.log('  No inbound emails yet. Waiting 1 second...');
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    const extractedCodes: CodeArray = [];

    for (const email of listData.data) {
      const emailTime = new Date(email.created_at).getTime();
      if (emailTime < cutoff) continue;

      // Fetch full email body
      const { data: fullEmail, error: getError } = await resend.emails.receiving.get(email.id);
      if (getError || !fullEmail) {
        console.log(`  Could not fetch email ${email.id}: ${getError?.message}`);
        continue;
      }

      // Extract text from the email
      let textBody = fullEmail.text || '';
      const htmlBody = fullEmail.html || '';

      if (!textBody && htmlBody) {
        const $ = cheerio.load(htmlBody);
        textBody = $.text();
      }

      const codeMatch = textBody.match(codePattern);
      if (!codeMatch) continue;

      const score = scoreEmail(fullEmail.from, htmlBody, hostname);
      extractedCodes.push({
        code: codeMatch[1],
        score,
        emailTimestamp: emailTime,
      });
    }

    if (extractedCodes.length > 0) {
      // Deduplicate: keep highest score per code
      const seen = new Map<string, CodeArray[0]>();
      for (const entry of extractedCodes) {
        const existing = seen.get(entry.code);
        if (!existing || entry.score > existing.score) {
          seen.set(entry.code, entry);
        }
      }

      const results = Array.from(seen.values());
      results.sort((a, b) => {
        if (a.score === b.score) return b.emailTimestamp - a.emailTimestamp;
        return b.score - a.score;
      });

      return results;
    }

    console.log('  2FA email not found yet via Resend. Waiting 1 second...');
    await new Promise((r) => setTimeout(r, 1000));
  }

  return [];
}
