import * as cheerio from 'cheerio';


export function getRequestVerificationTokenFromBody(html: string): string | undefined {
  const $ = cheerio.load(html);

  const tokenEle = $('input[name="__RequestVerificationToken"]')

  const requestVerificationToken = tokenEle?.[0]?.attribs?.value

  if (!requestVerificationToken) {
    console.log('could not find request verification token', html)
    return undefined;
  }

  return requestVerificationToken;

}

/**
 * Sentinel returned by parseMyChartDate for missing/unparseable input.
 * Negative-infinity sorts before any valid date (including pre-1970),
 * so a newest-first sort using this key always places undated items last.
 */
export const MISSING_DATE = Number.NEGATIVE_INFINITY;

/**
 * Parse a MyChart date string (ISO 8601 preferred, falls back to human
 * display like "May 12, 2026 8:56 PM") into epoch milliseconds.
 * Returns MISSING_DATE for empty/unparseable input so undated items sort
 * after any valid date (including pre-1970) in newest-first comparisons.
 */
export function parseMyChartDate(s: string | undefined | null): number {
  if (!s) return MISSING_DATE;
  const ms = Date.parse(s);
  return Number.isNaN(ms) ? MISSING_DATE : ms;
}

/**
 * Sort items newest-first in place using a date extractor. Items returning
 * MISSING_DATE from the key fn land at the end. Returns the same array.
 */
export function sortNewestFirstByDate<T>(items: T[], keyFn: (item: T) => number): T[] {
  return items.sort((a, b) => keyFn(b) - keyFn(a));
}
