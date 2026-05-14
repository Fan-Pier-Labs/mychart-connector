/**
 * Tests for fake-mychart features added alongside the marge user:
 *   - The marge user requires TOTP 2FA at login
 *   - GET /reset serves an HTML page with a reset button
 *   - POST /reset wipes mutable in-memory state (sessions, per-user TOTP)
 *
 * Requires fake-mychart running on FAKE_MYCHART_HOST (default localhost:4000).
 *
 * Run with: bun test scrapers/myChart/__tests__/fake-mychart/marge-and-reset.test.ts
 */

import { describe, it, expect, afterEach } from 'bun:test'
import { myChartUserPassLogin, complete2faFlow } from '../../login'
import { getMyChartProfile } from '../../profile'

const HOST = process.env.FAKE_MYCHART_HOST ?? 'localhost:4000'
const BASE = `http://${HOST}`

async function postReset(): Promise<void> {
  const r = await fetch(`${BASE}/reset`, { method: 'POST' })
  if (!r.ok) throw new Error(`/reset failed: ${r.status}`)
}

function buildLoginInfo(user: string, pass: string): string {
  return JSON.stringify({
    Type: 'PasswordLogin',
    Credentials: {
      Username: Buffer.from(user).toString('base64'),
      Password: Buffer.from(pass).toString('base64'),
    },
  })
}

async function rawDoLogin(user: string, pass: string): Promise<{ status: number; body: string; cookie: string | null }> {
  const r = await fetch(`${BASE}/MyChart/Authentication/Login/DoLogin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'LoginInfo=' + encodeURIComponent(buildLoginInfo(user, pass)),
  })
  return { status: r.status, body: await r.text(), cookie: r.headers.get('set-cookie') }
}

describe('fake-mychart marge user + /reset', () => {
  // Reset state after every test so order doesn't matter and TOTP toggles
  // don't bleed between tests.
  afterEach(postReset)

  it('homer logs in directly without 2FA', async () => {
    const result = await myChartUserPassLogin({
      hostname: HOST,
      user: 'homer',
      pass: 'donuts123',
      protocol: 'http',
    })
    expect(result.state).toBe('logged_in')
  }, 15_000)

  it('homer and marge get distinct profiles when scraped on the same hostname', async () => {
    const homerLogin = await myChartUserPassLogin({
      hostname: HOST,
      user: 'homer',
      pass: 'donuts123',
      protocol: 'http',
    })
    expect(homerLogin.state).toBe('logged_in')
    if (homerLogin.state !== 'logged_in') return
    const homerProfile = await getMyChartProfile(homerLogin.mychartRequest)
    expect(homerProfile?.name).toContain('Homer')
    expect(homerProfile?.mrn).toBe('742')

    // Marge requires 2FA. complete2faFlow with the fixed-in-fake-mychart code.
    const margeLogin = await myChartUserPassLogin({
      hostname: HOST,
      user: 'marge',
      pass: 'donuts123',
      protocol: 'http',
    })
    expect(margeLogin.state).toBe('need_2fa')
    if (margeLogin.state !== 'need_2fa') return
    const margeFinish = await complete2faFlow({
      mychartRequest: margeLogin.mychartRequest,
      code: '123456',
      isTOTP: true,
    })
    expect(margeFinish.state).toBe('logged_in')
    if (margeFinish.state !== 'logged_in') return
    const margeProfile = await getMyChartProfile(margeFinish.mychartRequest)
    expect(margeProfile?.name).toContain('Marge')
    expect(margeProfile?.mrn).toBe('743')

    // Crucially, the two scrapes return distinct MRNs even though they hit
    // the same fake-mychart hostname.
    expect(homerProfile?.mrn).not.toBe(margeProfile?.mrn)
  }, 20_000)

  it('marge login requires 2FA (TOTP enabled by default)', async () => {
    const result = await myChartUserPassLogin({
      hostname: HOST,
      user: 'marge',
      pass: 'donuts123',
      protocol: 'http',
    })
    expect(result.state).toBe('need_2fa')
  }, 15_000)

  it('marge login fails with wrong password', async () => {
    const result = await myChartUserPassLogin({
      hostname: HOST,
      user: 'marge',
      pass: 'not-donuts',
      protocol: 'http',
    })
    expect(result.state).toBe('invalid_login')
  }, 15_000)

  it('GET /reset returns the HTML reset page with a button', async () => {
    const r = await fetch(`${BASE}/reset`)
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type') ?? '').toContain('text/html')
    const body = await r.text()
    expect(body).toContain('Reset Fake MyChart RAM')
    expect(body).toContain('<button')
  })

  it('POST /reset returns ok and restores homer TOTP toggle to off', async () => {
    // Log in as homer to seed a session, then enable his TOTP via the toggle
    // endpoint. The toggle only changes the UI flag, not the login flow, so
    // homer can keep logging in with username+password.
    const loginResp = await rawDoLogin('homer', 'donuts123')
    expect(loginResp.body).toContain('md_home_index')
    const sessionCookie = (loginResp.cookie ?? '').split(';')[0]

    await fetch(`${BASE}/MyChart/api/secondary-validation/UpdateTwoFactorTotpOptInStatus`, {
      method: 'POST',
      headers: { Cookie: sessionCookie },
    })
    const totpInfoBefore = await fetch(`${BASE}/MyChart/api/secondary-validation/GetTwoFactorInfo`, {
      method: 'POST',
      headers: { Cookie: sessionCookie },
    }).then(r => r.json()) as { IsTotpEnabled: boolean }
    expect(totpInfoBefore.IsTotpEnabled).toBe(true)

    // Reset wipes sessions AND restores per-user TOTP back to seed values
    const resetResp = await fetch(`${BASE}/reset`, { method: 'POST' })
    expect(resetResp.status).toBe(200)
    expect(await resetResp.json()).toEqual({ ok: true })

    // After reset, log in again and confirm homer's TOTP is back to disabled
    const reloginResp = await rawDoLogin('homer', 'donuts123')
    const reloginCookie = (reloginResp.cookie ?? '').split(';')[0]
    const totpInfoAfter = await fetch(`${BASE}/MyChart/api/secondary-validation/GetTwoFactorInfo`, {
      method: 'POST',
      headers: { Cookie: reloginCookie },
    }).then(r => r.json()) as { IsTotpEnabled: boolean }
    expect(totpInfoAfter.IsTotpEnabled).toBe(false)

    // Marge is still always-2FA regardless of resets
    const marge = await rawDoLogin('marge', 'donuts123')
    expect(marge.body).toContain('secondaryvalidationcontroller')
  }, 30_000)
})
