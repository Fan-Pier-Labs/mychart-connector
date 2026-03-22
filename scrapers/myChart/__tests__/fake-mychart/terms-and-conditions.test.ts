/**
 * Integration tests for auto-accepting Terms & Conditions against fake-mychart
 * with FAKE_MYCHART_REQUIRE_TERMS=true.
 *
 * The fake-mychart server must be running on localhost:4001 (or FAKE_MYCHART_TERMS_HOST)
 * with FAKE_MYCHART_REQUIRE_TERMS=true before these tests are executed.
 *
 * Run with: bun test scrapers/myChart/__tests__/fake-mychart/terms-and-conditions.test.ts
 */

import { describe, it, expect } from 'bun:test'
import { myChartUserPassLogin, complete2faFlow } from '../../login'
import { getMyChartProfile } from '../../profile'
import { setupTotp } from '../../setupTotp'

const HOST = process.env.FAKE_MYCHART_TERMS_HOST ?? 'localhost:4001'

describe('terms-and-conditions auto-accept', () => {

  describe('login without 2FA', () => {
    it('login auto-accepts T&C and returns logged_in', async () => {
      const result = await myChartUserPassLogin({
        hostname: HOST,
        user: 'homer',
        pass: 'donuts123',
        protocol: 'http',
      })
      expect(result.state).toBe('logged_in')
    }, 30_000)

    it('scrapers work after auto-accepted T&C', async () => {
      const result = await myChartUserPassLogin({
        hostname: HOST,
        user: 'homer',
        pass: 'donuts123',
        protocol: 'http',
      })
      expect(result.state).toBe('logged_in')

      const profile = await getMyChartProfile(result.mychartRequest)
      expect(profile).not.toBeNull()
      expect(profile!.name).toBe('Homer Jay Simpson')
    }, 30_000)
  })

  describe('login with 2FA', () => {
    it('2FA completion auto-accepts T&C and returns logged_in', async () => {
      const loginResult = await myChartUserPassLogin({
        hostname: HOST,
        user: 'homer',
        pass: 'donuts123',
        protocol: 'http',
        skipSendCode: true,
      })

      // With REQUIRE_2FA + REQUIRE_TERMS, login should first need 2FA
      // If the server doesn't require 2FA, it goes straight to logged_in (auto-accepted)
      if (loginResult.state === 'need_2fa') {
        const twofaResult = await complete2faFlow({
          mychartRequest: loginResult.mychartRequest,
          code: '123456',
        })
        expect(twofaResult.state).toBe('logged_in')

        const profile = await getMyChartProfile(twofaResult.mychartRequest)
        expect(profile).not.toBeNull()
        expect(profile!.name).toBe('Homer Jay Simpson')
      } else {
        // Server doesn't require 2FA, T&C was auto-accepted
        expect(loginResult.state).toBe('logged_in')
      }
    }, 30_000)
  })

  describe('TOTP setup after auto-accepted terms', () => {
    it('TOTP setup works after T&C is auto-accepted', async () => {
      const loginResult = await myChartUserPassLogin({
        hostname: HOST,
        user: 'homer',
        pass: 'donuts123',
        protocol: 'http',
      })
      expect(loginResult.state).toBe('logged_in')

      const secret = await setupTotp(loginResult.mychartRequest, 'donuts123')
      expect(secret).not.toBeNull()
      expect(typeof secret).toBe('string')
      expect(secret!.length).toBeGreaterThan(0)
    }, 30_000)
  })
})
