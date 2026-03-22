import { TOTP } from 'totp-generator';

/**
 * Generate a TOTP code from a Base32-encoded secret.
 * MyChart uses standard 6-digit, 30-second TOTP codes.
 */
export async function generateTotpCode(secret: string, timestamp?: number): Promise<string> {
  // Clean up the secret: remove spaces, uppercase
  const cleanSecret = secret.replace(/\s+/g, '').toUpperCase();
  const { otp } = await TOTP.generate(cleanSecret, { timestamp });
  return otp;
}

/**
 * Parse an otpauth:// URI (from a QR code) and extract the secret.
 * Format: otpauth://totp/Label?secret=BASE32SECRET&issuer=Issuer
 */
export function parseTotpUri(uri: string): { secret: string; issuer: string; account: string } {
  const url = new URL(uri);
  const secret = url.searchParams.get('secret') || '';
  const issuer = url.searchParams.get('issuer') || '';
  const account = decodeURIComponent(url.pathname.replace('/totp/', '').replace(/^\//, ''));
  return { secret, issuer, account };
}
