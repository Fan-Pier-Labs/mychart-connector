import { describe, it, expect } from 'bun:test';

/**
 * Tests for the report HTML → plain text extraction logic
 * used as a fallback in imaging CLI when narrative/impression fields are empty.
 *
 * This mirrors the inline logic in cli.ts for the imaging report fallback.
 */
function extractReportText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('report text extraction from HTML', () => {
  it('strips HTML tags', () => {
    const html = '<div><p>Normal chest X-ray</p></div>';
    expect(extractReportText(html)).toBe('Normal chest X-ray');
  });

  it('decodes &nbsp; entities', () => {
    const html = 'No&nbsp;acute&nbsp;findings';
    expect(extractReportText(html)).toBe('No acute findings');
  });

  it('decodes &#39; apostrophe entities', () => {
    const html = 'Patient&#39;s lungs are clear';
    expect(extractReportText(html)).toBe("Patient's lungs are clear");
  });

  it('decodes &amp; &lt; &gt; entities', () => {
    const html = 'A &amp; B &lt;normal&gt;';
    expect(extractReportText(html)).toBe('A & B <normal>');
  });

  it('collapses whitespace', () => {
    const html = '<p>Line one</p>   <p>Line two</p>\n\n<p>Line three</p>';
    expect(extractReportText(html)).toBe('Line one Line two Line three');
  });

  it('handles complex real-world report HTML', () => {
    const html = `<div class="report-content"><h3>FINDINGS:</h3><p>The heart is normal in size.&nbsp;The lungs are clear.&nbsp;No pleural effusion.</p><h3>IMPRESSION:</h3><p>Normal chest radiograph.&nbsp;No acute cardiopulmonary process.</p></div>`;
    const text = extractReportText(html);
    expect(text).toContain('FINDINGS:');
    expect(text).toContain('The heart is normal in size.');
    expect(text).toContain('IMPRESSION:');
    expect(text).toContain('Normal chest radiograph.');
  });

  it('returns empty string for empty HTML', () => {
    expect(extractReportText('')).toBe('');
  });

  it('returns short text as-is (used for length check > 20)', () => {
    const html = '<p>OK</p>';
    const text = extractReportText(html);
    expect(text).toBe('OK');
    expect(text.length).toBeLessThanOrEqual(20);
  });
});
