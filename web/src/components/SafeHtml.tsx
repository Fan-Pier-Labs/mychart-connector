'use client';

import { sanitizeHtml } from '@/lib/sanitize-html';

/**
 * Renders sanitized HTML from external sources (MyChart API responses, scraped content).
 *
 * This is the ONLY component in the project that uses dangerouslySetInnerHTML.
 * All external HTML must go through this component — never use dangerouslySetInnerHTML directly.
 */
export function SafeHtml({ html, token, className }: { html: string; token: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html, token) }} />;
}
