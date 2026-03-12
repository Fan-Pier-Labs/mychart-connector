import { randomBytes, createHash } from 'crypto';
import { Pool } from 'pg';
import { getPoolOptions } from './config';

let pool: Pool | null = null;

async function getPool(): Promise<Pool> {
  if (pool) return pool;
  const opts = await getPoolOptions();
  pool = new Pool(opts);
  return pool;
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a new API key for a user. Stores SHA-256 hash in the user table.
 * Returns the plaintext key (shown once to the user).
 */
export async function generateApiKey(userId: string): Promise<string> {
  const key = randomBytes(32).toString('hex');
  const hash = hashKey(key);
  const db = await getPool();
  await db.query('UPDATE "user" SET mcp_api_key_hash = $1 WHERE id = $2', [hash, userId]);
  return key;
}

/**
 * Validate an API key. Returns the userId if valid, null otherwise.
 */
export async function validateApiKey(key: string): Promise<{ userId: string } | null> {
  const hash = hashKey(key);
  const db = await getPool();
  const result = await db.query('SELECT id FROM "user" WHERE mcp_api_key_hash = $1', [hash]);
  if (result.rows.length === 0) return null;
  return { userId: result.rows[0].id };
}

/**
 * Revoke a user's API key by setting the hash to NULL.
 */
export async function revokeApiKey(userId: string): Promise<void> {
  const db = await getPool();
  await db.query('UPDATE "user" SET mcp_api_key_hash = NULL WHERE id = $1', [userId]);
}

/**
 * Check if a user has an API key set.
 */
export async function hasApiKey(userId: string): Promise<boolean> {
  const db = await getPool();
  const result = await db.query('SELECT mcp_api_key_hash FROM "user" WHERE id = $1', [userId]);
  return result.rows.length > 0 && result.rows[0].mcp_api_key_hash !== null;
}
