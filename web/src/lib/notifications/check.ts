import {
  getNotificationEnabledInstances,
  updateNotificationLastChecked,
} from '@/lib/db';
import { autoConnectInstance } from '@/lib/mcp/auto-connect';
import { getSession } from '@/lib/sessions';
import { detectChanges } from './change-detector';
import { getImagingAttachments } from './imaging';
import { buildSummaryEmail, buildDetailedEmail } from './templates';
import { sendNotificationEmail } from './email';

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check all notification-enabled users for MyChart changes and send emails.
 */
export async function checkAllUsers(): Promise<{ checked: number; sent: number; errors: number }> {
  const instances = await getNotificationEnabledInstances();
  let checked = 0;
  let sent = 0;
  let errors = 0;

  for (const instance of instances) {
    try {
      // Auto-connect (requires TOTP)
      const connectResult = await autoConnectInstance(instance.userId, instance);
      if (connectResult !== 'logged_in') {
        console.warn(`[notifications] Could not connect to ${instance.hostname} for user ${instance.userId}: ${connectResult}`);
        errors++;
        continue;
      }

      const sessionKey = `${instance.userId}:${instance.id}`;
      const mychartRequest = getSession(sessionKey);
      if (!mychartRequest) {
        console.warn(`[notifications] No session found after connect for ${instance.hostname}`);
        errors++;
        continue;
      }

      checked++;

      // First run: establish baseline, don't send email
      if (!instance.notificationsLastCheckedAt) {
        console.log(`[notifications] ${instance.hostname}: first run, establishing baseline`);
        await updateNotificationLastChecked(instance.id, instance.userId);
        continue;
      }

      // Detect changes
      const { changes, newImagingResults } = await detectChanges(
        mychartRequest,
        instance.notificationsLastCheckedAt
      );

      if (changes.length === 0) {
        console.log(`[notifications] ${instance.hostname}: no changes detected`);
        await updateNotificationLastChecked(instance.id, instance.userId);
        continue;
      }

      // Build email
      let email;
      if (instance.includeContent) {
        // Get imaging attachments if there are new imaging results
        let imageAttachments: { filename: string; content: Buffer }[] = [];
        if (newImagingResults.length > 0) {
          try {
            imageAttachments = await getImagingAttachments(mychartRequest, newImagingResults);
          } catch (err) {
            console.warn(`[notifications] Imaging attachment failed:`, (err as Error).message);
          }
        }
        email = buildDetailedEmail(changes, instance.hostname, imageAttachments);
      } else {
        email = buildSummaryEmail(changes, instance.hostname);
      }

      // Send email
      await sendNotificationEmail(instance.userEmail, email);
      sent++;
      console.log(`[notifications] Sent email to ${instance.userEmail} for ${instance.hostname}: ${changes.length} categories`);

      await updateNotificationLastChecked(instance.id, instance.userId);
    } catch (err) {
      console.error(`[notifications] Error checking ${instance.hostname}:`, (err as Error).message);
      errors++;
    }
  }

  return { checked, sent, errors };
}

/**
 * Start the daily notification checker. Call once on server startup.
 */
export function startNotificationChecker(): void {
  async function run() {
    try {
      console.log('[notifications] Starting daily check...');
      const result = await checkAllUsers();
      console.log(`[notifications] Checked ${result.checked} users, sent ${result.sent} emails, ${result.errors} errors`);
    } catch (err) {
      console.error('[notifications] checkAllUsers threw:', (err as Error).message);
    }
  }

  // Run immediately on startup
  run();

  // Then every 24 hours
  setInterval(run, CHECK_INTERVAL_MS);
}
