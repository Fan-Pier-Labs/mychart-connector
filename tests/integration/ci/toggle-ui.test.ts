/**
 * UI Integration Test: Instance Enable/Disable Toggle
 *
 * Uses Playwright to verify the toggle switch works in a real browser.
 * Runs against Docker Compose services (same as integration.test.ts).
 *
 * Sign-up and instance creation happen via API (faster, more reliable),
 * then we load the home page and test the toggle UI.
 *
 * Note: We use Bun's expect() + Playwright's native locator methods
 * (isVisible, getAttribute, count) rather than @playwright/test's
 * custom expect matchers which aren't available with Bun's test runner.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { chromium, type Browser, type Page } from 'playwright';

const BASE_URL = process.env.CI_WEB_URL || 'http://localhost:8080';
const FAKE_MYCHART_HOSTNAME = process.env.CI_FAKE_MYCHART_HOSTNAME || 'fake-mychart:3000';

const TEST_EMAIL = `ci-toggle-ui-${Date.now()}@example.com`;
const TEST_PASSWORD = 'ToggleTest123!';
const TEST_NAME = 'Toggle UI Test';

let browser: Browser;
let page: Page;
let authCookies = '';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseCookieString(c: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (!c) return map;
  for (const part of c.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx > 0) {
      map[part.slice(0, eqIdx).trim()] = part.slice(eqIdx + 1).trim();
    }
  }
  return map;
}

function extractCookies(res: Response): string {
  const setCookieHeaders = res.headers.getSetCookie?.() ?? [];
  const existing = parseCookieString(authCookies);
  for (const header of setCookieHeaders) {
    const nameValue = header.split(';')[0];
    const eqIdx = nameValue.indexOf('=');
    if (eqIdx > 0) {
      existing[nameValue.slice(0, eqIdx).trim()] = nameValue.slice(eqIdx + 1).trim();
    }
  }
  return Object.entries(existing).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function apiSignUp() {
  const res = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME }),
    redirect: 'manual',
  });
  authCookies = extractCookies(res);
  return res;
}

async function apiAddInstance() {
  const res = await fetch(`${BASE_URL}/api/mychart-instances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: authCookies, Origin: BASE_URL },
    body: JSON.stringify({
      hostname: FAKE_MYCHART_HOSTNAME,
      username: 'homer',
      password: 'donuts123',
    }),
    redirect: 'manual',
  });
  authCookies = extractCookies(res);
  return res;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => {
  // 1. Sign up via API
  const signUpRes = await apiSignUp();
  if (signUpRes.status !== 200) {
    throw new Error(`Sign-up failed: ${signUpRes.status}`);
  }

  // 2. Add a MyChart instance via API
  const addRes = await apiAddInstance();
  if (addRes.status !== 201) {
    throw new Error(`Add instance failed: ${addRes.status}`);
  }

  // 3. Launch browser and set cookies
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Set auth cookies in the browser context
  const cookieMap = parseCookieString(authCookies);
  const url = new URL(BASE_URL);
  const cookieObjects = Object.entries(cookieMap).map(([name, value]) => ({
    name,
    value,
    domain: url.hostname,
    path: '/',
  }));
  await context.addCookies(cookieObjects);

  page = await context.newPage();
}, 30_000);

afterAll(async () => {
  await browser?.close();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Toggle UI', () => {
  it('loads the home page with the instance visible', async () => {
    await page.goto(`${BASE_URL}/home`);
    await page.waitForLoadState('networkidle');

    // Wait for the instance hostname to appear
    const hostnameLocator = page.getByText(FAKE_MYCHART_HOSTNAME);
    await hostnameLocator.waitFor({ state: 'visible', timeout: 10_000 });
    expect(await hostnameLocator.isVisible()).toBe(true);
  }, 30_000);

  it('toggle switch is visible and enabled by default', async () => {
    const toggle = page.locator('button[role="switch"]').first();
    await toggle.waitFor({ state: 'visible', timeout: 5_000 });
    expect(await toggle.isVisible()).toBe(true);

    const checked = await toggle.getAttribute('aria-checked');
    expect(checked).toBe('true');
  });

  it('clicking toggle disables the instance', async () => {
    const toggle = page.locator('button[role="switch"]').first();
    await toggle.click();

    // Wait for the PATCH API call to complete
    await page.waitForResponse(
      resp => resp.url().includes('/api/mychart-instances/') && resp.request().method() === 'PATCH',
      { timeout: 5_000 }
    );

    // Small delay for React re-render
    await page.waitForTimeout(500);

    // Toggle should now be unchecked
    const checked = await toggle.getAttribute('aria-checked');
    expect(checked).toBe('false');
  });

  it('disabled instance shows "Disabled" label', async () => {
    const disabledLabel = page.getByText('Disabled').first();
    expect(await disabledLabel.isVisible()).toBe(true);
  });

  it('disabled instance card has dimmed styling', async () => {
    const dimmedCards = await page.locator('.opacity-60').count();
    expect(dimmedCards).toBeGreaterThan(0);
  });

  it('Connect button is not visible when disabled', async () => {
    const connectButton = page.getByRole('button', { name: 'Connect' });
    expect(await connectButton.isVisible()).toBe(false);
  });

  it('clicking toggle re-enables the instance', async () => {
    const toggle = page.locator('button[role="switch"]').first();
    await toggle.click();

    // Wait for the PATCH API call
    await page.waitForResponse(
      resp => resp.url().includes('/api/mychart-instances/') && resp.request().method() === 'PATCH',
      { timeout: 5_000 }
    );

    await page.waitForTimeout(500);

    const checked = await toggle.getAttribute('aria-checked');
    expect(checked).toBe('true');
  });

  it('"Disabled" label disappears after re-enabling', async () => {
    // Wait a moment for React re-render, then check no "Disabled" labels in instance cards
    const disabledLabels = page.locator('[class*="rounded-lg"] >> text=Disabled');
    expect(await disabledLabels.count()).toBe(0);
  });

  it('dimmed styling is removed after re-enabling', async () => {
    const dimmedCards = await page.locator('.opacity-60').count();
    expect(dimmedCards).toBe(0);
  });
});
