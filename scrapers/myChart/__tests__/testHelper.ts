/**
 * Test helper for integration tests.
 * Provides an authenticated MyChartRequest session for Example Health MyChart.
 *
 * Session loading priority:
 * 1. Load from .cookie-cache/mychart.example.org.json
 * 2. If expired/missing, log in with a saved passkey from .passkey-credentials/mychart.example.org.json
 * 3. Save new session to cache for subsequent runs
 *
 * To set up the passkey, run:
 *   bun run cli mychart --host mychart.example.org --set-up-passkey
 */

import * as fs from 'fs'
import * as path from 'path'
import { MyChartRequest } from '../myChartRequest'
import { myChartPasskeyLogin, areCookiesValid } from '../login'
import { loadPasskeyCredential } from '../../../npm-package/cli/passkeyStore'

const TEST_HOSTNAME = 'mychart.example.org'
const COOKIE_CACHE_DIR = path.resolve(__dirname, '../../../.cookie-cache')

let cachedSession: MyChartRequest | null = null

export async function getTestSession(): Promise<MyChartRequest> {
  if (cachedSession) {
    return cachedSession
  }

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

  const credential = await loadPasskeyCredential(TEST_HOSTNAME)
  if (!credential) {
    throw new Error(
      `No saved passkey for ${TEST_HOSTNAME}. Run: bun run cli mychart --host ${TEST_HOSTNAME} --set-up-passkey`
    )
  }

  const loginResult = await myChartPasskeyLogin({
    hostname: TEST_HOSTNAME,
    credential,
  })

  if (loginResult.state === 'logged_in') {
    cachedSession = loginResult.mychartRequest
    await saveCachedSession(loginResult.mychartRequest)
    return loginResult.mychartRequest
  }

  throw new Error(`Passkey login failed: ${loginResult.state}${loginResult.error ? ` - ${loginResult.error}` : ''}`)
}

async function saveCachedSession(req: MyChartRequest): Promise<void> {
  await fs.promises.mkdir(COOKIE_CACHE_DIR, { recursive: true })
  const cachePath = path.join(COOKIE_CACHE_DIR, `${TEST_HOSTNAME}.json`)
  await fs.promises.writeFile(cachePath, await req.serialize())
}
