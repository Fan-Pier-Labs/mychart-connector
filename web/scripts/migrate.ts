/**
 * Database migration script.
 * Creates BetterAuth tables and the custom mychart_instances table.
 *
 * Usage: bun run web/scripts/migrate.ts
 */

import { getAuth } from '../src/lib/auth';
import { Pool } from 'pg';
import { getPoolOptions } from '../src/lib/mcp/config';

async function main() {
  console.log('[migrate] Starting migrations...');

  // 1. Run BetterAuth migrations via $context.runMigrations
  const auth = await getAuth();
  const ctx = await auth.$context;
  if (ctx.runMigrations) {
    console.log('[migrate] Running BetterAuth migrations...');
    await ctx.runMigrations();
    console.log('[migrate] BetterAuth migrations complete.');
  } else {
    console.log('[migrate] No BetterAuth runMigrations found, tables may already exist.');
  }

  // 2. Create custom mychart_instances table
  const opts = await getPoolOptions();
  const pool = new Pool(opts);

  console.log('[migrate] Creating mychart_instances table...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mychart_instances (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      hostname TEXT NOT NULL,
      username TEXT NOT NULL,
      encrypted_password TEXT NOT NULL,
      encrypted_totp_secret TEXT,
      mychart_email TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, hostname, username)
    );
  `);
  console.log('[migrate] mychart_instances table ready.');

  // 3. Add mcp_api_key_hash column to user table
  console.log('[migrate] Adding mcp_api_key_hash column to user table...');
  await pool.query(`
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS mcp_api_key_hash TEXT UNIQUE;
  `);
  console.log('[migrate] mcp_api_key_hash column ready.');

  await pool.end();
  console.log('[migrate] Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[migrate] Error:', err);
  process.exit(1);
});
