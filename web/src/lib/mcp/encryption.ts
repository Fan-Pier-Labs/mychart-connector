import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';
import { getEncryptionKey } from './config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

function deriveKeyFromSecret(secret: string | Buffer, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LENGTH);
}

async function deriveKey(salt: Buffer): Promise<Buffer> {
  const secret = await getEncryptionKey();
  return deriveKeyFromSecret(secret, salt);
}

function encryptWithSecret(plaintext: string, secret: string | Buffer): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKeyFromSecret(secret, salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, encrypted]).toString('base64url');
}

function decryptWithSecret(encoded: string, secret: string | Buffer): string {
  const combined = Buffer.from(encoded, 'base64url');
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const key = deriveKeyFromSecret(secret, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

export async function encrypt(plaintext: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: salt + iv + tag + ciphertext, all base64url encoded
  const combined = Buffer.concat([salt, iv, tag, encrypted]);
  return combined.toString('base64url');
}

export async function decrypt(encoded: string): Promise<string> {
  const combined = Buffer.from(encoded, 'base64url');
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const key = await deriveKey(salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

export async function encryptCredentials(username: string, password: string): Promise<string> {
  return encrypt(JSON.stringify({ username, password }));
}

export async function decryptCredentials(encrypted: string): Promise<{ username: string; password: string }> {
  return JSON.parse(await decrypt(encrypted));
}

// ── Client-key (CEK) layered encryption ──
// The CEK lives only in the user's browser localStorage and inside their MCP
// URL; it is never persisted server-side. When a user has
// `client_encryption_enabled = true`, credentials are stored as
// `env_encrypt(cek_encrypt(plaintext))`, so a DB leak + env-key leak alone
// is not sufficient to recover the plaintext.

function normalizeClientKey(cekHex: string): string {
  const trimmed = cekHex.trim().toLowerCase();
  if (!/^[0-9a-f]{32,}$/.test(trimmed)) {
    throw new Error('Invalid client encryption key format');
  }
  return trimmed;
}

export function encryptWithClientKey(plaintext: string, cekHex: string): string {
  return encryptWithSecret(plaintext, normalizeClientKey(cekHex));
}

export function decryptWithClientKey(encoded: string, cekHex: string): string {
  return decryptWithSecret(encoded, normalizeClientKey(cekHex));
}

export async function encryptLayered(plaintext: string, cekHex: string): Promise<string> {
  const inner = encryptWithClientKey(plaintext, cekHex);
  return encrypt(inner);
}

export async function decryptLayered(encoded: string, cekHex: string): Promise<string> {
  const inner = await decrypt(encoded);
  return decryptWithClientKey(inner, cekHex);
}
