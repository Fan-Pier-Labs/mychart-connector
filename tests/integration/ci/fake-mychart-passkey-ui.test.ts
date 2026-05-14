/**
 * UI Integration Test: fake-mychart passkey registration + sign-in via the
 * browser. Uses Playwright's CDP `WebAuthn.addVirtualAuthenticator` so the
 * browser silently approves credentials instead of prompting Touch ID.
 *
 * Verifies:
 *   1. Logged-in homer can click "Add Passkey" in /MyChart/Settings and a
 *      real WebAuthn credential is registered with the fake server.
 *   2. After signing out, the "Sign in with Passkey" button on the login
 *      page authenticates using that same credential and lands on /Home.
 *
 * Run with the fake-mychart server on FAKE_MYCHART_BASE (default
 * http://localhost:4000). In CI this is the dockerized fake-mychart.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

const BASE = process.env.FAKE_MYCHART_BASE || 'http://localhost:4000';

let browser: Browser;
let context: BrowserContext;
let page: Page;

async function resetState() {
  const r = await fetch(`${BASE}/reset`, { method: 'POST' });
  if (!r.ok) throw new Error(`/reset failed: ${r.status}`);
}

beforeAll(async () => {
  await resetState();
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext();
  page = await context.newPage();

  // Install a virtual WebAuthn authenticator that auto-approves prompts.
  const cdp = await context.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}, 30_000);

afterAll(async () => {
  await browser?.close();
  await resetState();
});

describe('fake-mychart passkey UI', () => {
  it('registers a passkey via the Settings UI', async () => {
    await page.goto(`${BASE}/MyChart/Authentication/Login`);
    await page.fill('#Login', 'homer');
    await page.fill('#Password', 'donuts123');
    await page.click('button#submit');
    await page.waitForURL(`${BASE}/MyChart/Home`, { timeout: 10_000 });

    await page.goto(`${BASE}/MyChart/Settings`);
    await page.click('button:has-text("Add Passkey")');
    // After registration the page reloads with the new passkey listed
    await page.waitForFunction(
      () => document.querySelector('#passkey-list')?.textContent?.includes('Passkey 1'),
      { timeout: 10_000 }
    );

    const list = await page.locator('#passkey-list').innerText();
    expect(list).toContain('Passkey 1');
    expect(list).toContain('Software Authenticator');
  }, 30_000);

  it('signs in with the passkey from the login page', async () => {
    await context.clearCookies();
    await page.goto(`${BASE}/MyChart/Authentication/Login`);
    await page.click('button:has-text("Sign in with Passkey")');
    await page.waitForURL(`${BASE}/MyChart/Home`, { timeout: 10_000 });
    expect(page.url()).toBe(`${BASE}/MyChart/Home`);
  }, 30_000);
});
