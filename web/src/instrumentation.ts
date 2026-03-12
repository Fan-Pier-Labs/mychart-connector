import { startKeepalive } from '@/lib/mcp/keepalive';
import { runMigrations } from '@/lib/migrate';

export async function register() {
  // Only run on the server (not edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      await runMigrations();
    } catch (err) {
      console.error('[instrumentation] Migration error:', err);
    }

    try {
      startKeepalive();
      console.log('[instrumentation] Keepalive service started');
    } catch (err) {
      console.error('[instrumentation] Keepalive setup error:', err);
    }
  }
}
