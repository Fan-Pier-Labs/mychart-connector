/**
 * Shared migration logic. Called by both the CLI migrate script and
 * the instrumentation hook (auto-migrate on startup).
 */

import { getAuth } from './auth';
import { Pool } from 'pg';
import { getPoolOptions } from './mcp/config';

export async function runMigrations(): Promise<void> {
  // 1. Run BetterAuth migrations
  const auth = await getAuth();
  const ctx = await auth.$context;
  if (ctx.runMigrations) {
    await ctx.runMigrations();
    console.log('[migrate] BetterAuth migrations complete.');
  }

  // 2. Create custom mychart_instances table
  const opts = await getPoolOptions();
  const pool = new Pool(opts);

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

  // 3. Add mcp_api_key_hash column to user table
  await pool.query(`
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS mcp_api_key_hash TEXT UNIQUE;
  `);

  // 4. Add notification preference columns to user table
  await pool.query(`
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT FALSE;
  `);
  await pool.query(`
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS notifications_include_content BOOLEAN DEFAULT FALSE;
  `);

  // 5. Add notification tracking column to mychart_instances
  await pool.query(`
    ALTER TABLE mychart_instances ADD COLUMN IF NOT EXISTS notifications_last_checked_at TIMESTAMPTZ;
  `);

  // 6. Add enabled column to mychart_instances (default TRUE)
  await pool.query(`
    ALTER TABLE mychart_instances ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;
  `);

  // 7. Add passkey credential column to mychart_instances
  await pool.query(`
    ALTER TABLE mychart_instances ADD COLUMN IF NOT EXISTS encrypted_passkey_credential TEXT;
  `);

  // 8. Add AI usage tracking columns to user table
  await pool.query(`
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS ai_spend_cents INTEGER DEFAULT 0;
  `);
  await pool.query(`
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS ai_spend_period TEXT;
  `);

  await pool.end();
  console.log('[migrate] Database migrations complete.');
}
