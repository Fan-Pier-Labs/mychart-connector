import type { CategoryChange } from './change-detector';

interface EmailAttachment {
  filename: string;
  content: Buffer;
  cid: string;
}

export interface EmailContent {
  subject: string;
  html: string;
  attachments: EmailAttachment[];
}

/**
 * Build a summary-only email (no medical content in body).
 */
export function buildSummaryEmail(
  changes: CategoryChange[],
  hostname: string
): EmailContent {
  const totalCount = changes.reduce((sum, c) => sum + c.newItems.length, 0);
  const subject = `MyChart Update: ${totalCount} change${totalCount !== 1 ? 's' : ''} detected`;

  const categoryLines = changes
    .map((c) => `<li><strong>${escapeHtml(c.category)}</strong> (${c.newItems.length})</li>`)
    .join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #1a56db;">MyChart Update</h2>
  <p>New activity was detected on your MyChart account (<strong>${escapeHtml(hostname)}</strong>):</p>
  <ul>${categoryLines}</ul>
  <p style="margin-top: 24px;">
    <a href="https://${escapeHtml(hostname)}" style="display: inline-block; padding: 10px 24px; background: #1a56db; color: #fff; text-decoration: none; border-radius: 6px;">Log in to MyChart</a>
  </p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="font-size: 12px; color: #9ca3af;">
    You're receiving this because you enabled notifications on MyChart MCP.
    To stop, disable notifications in your account settings.
  </p>
</body>
</html>`.trim();

  return { subject, html, attachments: [] };
}

/**
 * Build a detailed email with actual medical content and optional imaging attachments.
 */
export function buildDetailedEmail(
  changes: CategoryChange[],
  hostname: string,
  imageAttachments?: { filename: string; content: Buffer }[]
): EmailContent {
  const totalCount = changes.reduce((sum, c) => sum + c.newItems.length, 0);
  const subject = `MyChart Update: ${totalCount} change${totalCount !== 1 ? 's' : ''} detected`;

  const attachments: EmailAttachment[] = (imageAttachments ?? []).map((img, i) => ({
    filename: img.filename,
    content: img.content,
    cid: `xray-${i}`,
  }));

  const sections = changes.map((change) => {
    const itemsHtml = change.newItems.map((item) => {
      const lines: string[] = [];
      for (const [key, value] of Object.entries(item)) {
        if (key === 'date' || key === 'sentDate') continue;
        if (value === undefined || value === null || value === '') continue;
        const label = formatLabel(key);
        const displayValue = typeof value === 'boolean'
          ? (value ? 'Yes' : 'No')
          : String(value);
        lines.push(`<strong>${escapeHtml(label)}:</strong> ${escapeHtml(displayValue)}`);
      }
      const dateValue = (item.date ?? item.sentDate) as string | undefined;
      if (dateValue) {
        lines.push(`<em style="color: #6b7280;">${escapeHtml(dateValue)}</em>`);
      }
      return `<li style="margin-bottom: 8px;">${lines.join('<br/>')}</li>`;
    }).join('\n');

    return `
    <h3 style="color: #1a56db; margin-top: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">
      ${escapeHtml(change.category)} (${change.newItems.length})
    </h3>
    <ul style="list-style: none; padding-left: 0;">${itemsHtml}</ul>`;
  }).join('\n');

  // Add inline images if any
  const imagesHtml = attachments.length > 0
    ? `<h3 style="color: #1a56db; margin-top: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">X-ray Images</h3>` +
      attachments.map((a) =>
        `<div style="margin: 12px 0;">
          <p style="font-size: 13px; color: #6b7280;">${escapeHtml(a.filename)}</p>
          <img src="cid:${a.cid}" alt="${escapeHtml(a.filename)}" style="max-width: 100%; border: 1px solid #e5e7eb; border-radius: 4px;" />
        </div>`
      ).join('\n')
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #1a56db;">MyChart Update</h2>
  <p>New activity on <strong>${escapeHtml(hostname)}</strong>:</p>
  ${sections}
  ${imagesHtml}
  <p style="margin-top: 24px;">
    <a href="https://${escapeHtml(hostname)}" style="display: inline-block; padding: 10px 24px; background: #1a56db; color: #fff; text-decoration: none; border-radius: 6px;">Log in to MyChart</a>
  </p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="font-size: 12px; color: #9ca3af;">
    You're receiving this because you enabled detailed notifications on MyChart MCP.
    This email contains medical information. To stop, disable notifications in your account settings.
  </p>
</body>
</html>`.trim();

  return { subject, html, attachments };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
