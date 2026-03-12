/**
 * Database migration script.
 * Creates BetterAuth tables and the custom mychart_instances table.
 *
 * Usage: bun run web/scripts/migrate.ts
 */

import { runMigrations } from '../src/lib/migrate';

async function main() {
  console.log('[migrate] Starting migrations...');
  await runMigrations();
  console.log('[migrate] Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[migrate] Error:', err);
  process.exit(1);
});
