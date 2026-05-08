/**
 * Test helper for integration tests.
 * Provides an authenticated MyChartRequest session for Example Health MyChart.
 *
 * Session loading priority:
 * 1. Load from .cookie-cache/mychart.example.org.json
 * 2. If expired/missing, log in with credentials from browser keystore + Resend 2FA
 * 3. Save new session to cache for subsequent runs
 */

import * as fs from 'fs'
import * as path from 'path'
import { MyChartRequest } from '../myChartRequest'
import { myChartUserPassLogin, complete2faFlow, areCookiesValid } from '../login'

const TEST_HOSTNAME = 'mychart.example.org'
const COOKIE_CACHE_DIR = path.resolve(__dirname, '../../../.cookie-cache')

let cachedSession: MyChartRequest | null = null

export async function getTestSession(): Promise<MyChartRequest> {
  // Return in-memory cached session if still valid
  if (cachedSession) {
    return cachedSession
  }

  // Try loading from disk cache
  const cachePath = path.join(COOKIE_CACHE_DIR, `${TEST_HOSTNAME}.json`)
  try {
    const data = await fs.promises.readFile(cachePath, 'utf-8')
    const req = await MyChartRequest.unserialize(data)
    if (req) {
      const valid = await areCookiesValid(req)
      if (valid) {
        cachedSession = req
        return req
      }
    }
  } catch {
    // No cache file, proceed to login
  }

  // Login with credentials from browser keystore
  const { getMyChartAccounts } = await import('../../../read-local-passwords/index')
  const accounts = await getMyChartAccounts()
  const match = accounts.find(a => {
    try { return new URL(a.url).hostname === TEST_HOSTNAME } catch { return false }
  })

  if (!match || !match.user || !match.pass) {
    throw new Error(`No credentials found for ${TEST_HOSTNAME} in browser password stores`)
  }

  const loginResult = await myChartUserPassLogin({
    hostname: TEST_HOSTNAME,
    user: match.user,
    pass: match.pass,
  })

  if (loginResult.state === 'logged_in') {
    cachedSession = loginResult.mychartRequest
    await saveCachedSession(loginResult.mychartRequest)
    return loginResult.mychartRequest
  }

  if (loginResult.state === 'need_2fa') {
    // Auto-retrieve 2FA code via Resend
    const { get2FaCodeFromResend } = await import('../../../npm-package/cli/resend/resend')
    const codes = await get2FaCodeFromResend(loginResult.twoFaSentTime! - 5000, TEST_HOSTNAME)

    if (!codes || codes.length === 0) {
      throw new Error('Could not retrieve 2FA code from Resend')
    }

    const twoFaResult = await complete2faFlow({
      mychartRequest: loginResult.mychartRequest,
      twofaCodeArray: codes,
    })

    if (twoFaResult.state === 'logged_in') {
      cachedSession = twoFaResult.mychartRequest
      await saveCachedSession(twoFaResult.mychartRequest)
      return twoFaResult.mychartRequest
    }

    throw new Error(`2FA failed: ${twoFaResult.state}`)
  }

  throw new Error(`Login failed: ${loginResult.state} - ${loginResult.error}`)
}

async function saveCachedSession(req: MyChartRequest): Promise<void> {
  await fs.promises.mkdir(COOKIE_CACHE_DIR, { recursive: true })
  const cachePath = path.join(COOKIE_CACHE_DIR, `${TEST_HOSTNAME}.json`)
  await fs.promises.writeFile(cachePath, await req.serialize())
}
