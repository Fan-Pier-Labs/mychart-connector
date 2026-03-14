/**
 * Integration tests for the Terms & Conditions flow against fake-mychart
 * with FAKE_MYCHART_REQUIRE_TERMS=true.
 *
 * The fake-mychart server must be running on localhost:4001 (or FAKE_MYCHART_TERMS_HOST)
 * with FAKE_MYCHART_REQUIRE_TERMS=true before these tests are executed.
 *
 * Run with: bun test scrapers/myChart/__tests__/fake-mychart/terms-and-conditions.test.ts
 */

import { describe, it, expect, beforeAll } from 'bun:test'
import { myChartUserPassLogin, complete2faFlow } from '../../login'
import { acceptTermsAndConditions } from '../../termsAndConditions'
import { getMyChartProfile } from '../../profile'
import { setupTotp } from '../../setupTotp'

const HOST = process.env.FAKE_MYCHART_TERMS_HOST ?? 'localhost:4001'

describe('terms-and-conditions flow', () => {

  describe('login without 2FA', () => {
    it('login returns need_terms_acceptance when T&C is required', async () => {
      const result = await myChartUserPassLogin({
        hostname: HOST,
        user: 'homer',
        pass: 'donuts123',
        protocol: 'http',
      })
      expect(result.state).toBe('need_terms_acceptance')
    }, 30_000)

    it('accepting terms transitions session to working state', async () => {
      const loginResult = await myChartUserPassLogin({
        hostname: HOST,
        user: 'homer',
        pass: 'donuts123',
        protocol: 'http',
      })
      expect(loginResult.state).toBe('need_terms_acceptance')

      const accepted = await acceptTermsAndConditions(loginResult.mychartRequest)
      expect(accepted).toBe(true)

      // After accepting, scrapers should work
      const profile = await getMyChartProfile(loginResult.mychartRequest)
      expect(profile).not.toBeNull()
      expect(profile!.name).toBe('Homer Jay Simpson')
    }, 30_000)
  })

  describe('login with 2FA', () => {
    it('2FA completion returns need_terms_acceptance when T&C is required', async () => {
      const loginResult = await myChartUserPassLogin({
        hostname: HOST,
        user: 'homer',
        pass: 'donuts123',
        protocol: 'http',
        skipSendCode: true,
      })

      // With REQUIRE_2FA + REQUIRE_TERMS, login should first need 2FA
      // If the server doesn't require 2FA, it goes straight to need_terms_acceptance
      if (loginResult.state === 'need_2fa') {
        const twofaResult = await complete2faFlow({
          mychartRequest: loginResult.mychartRequest,
          code: '123456',
        })
        expect(twofaResult.state).toBe('need_terms_acceptance')

        const accepted = await acceptTermsAndConditions(twofaResult.mychartRequest)
        expect(accepted).toBe(true)

        const profile = await getMyChartProfile(twofaResult.mychartRequest)
        expect(profile).not.toBeNull()
        expect(profile!.name).toBe('Homer Jay Simpson')
      } else {
        // Server doesn't require 2FA, just terms
        expect(loginResult.state).toBe('need_terms_acceptance')
      }
    }, 30_000)
  })

  describe('scrapers fail without accepting terms', () => {
    it('profile scraper fails when terms not accepted', async () => {
      const loginResult = await myChartUserPassLogin({
        hostname: HOST,
        user: 'homer',
        pass: 'donuts123',
        protocol: 'http',
      })
      expect(loginResult.state).toBe('need_terms_acceptance')

      // Try to scrape without accepting — should fail or return null
      const profile = await getMyChartProfile(loginResult.mychartRequest)
      // The profile scraper hits /Home which redirects to T&C, so it won't find the MRN
      expect(profile).toBeNull()
    }, 30_000)
  })

  describe('TOTP setup after accepting terms', () => {
    it('TOTP setup works after terms are accepted', async () => {
      const loginResult = await myChartUserPassLogin({
        hostname: HOST,
        user: 'homer',
        pass: 'donuts123',
        protocol: 'http',
      })
      expect(loginResult.state).toBe('need_terms_acceptance')

      const accepted = await acceptTermsAndConditions(loginResult.mychartRequest)
      expect(accepted).toBe(true)

      // TOTP setup should now succeed
      const secret = await setupTotp(loginResult.mychartRequest, 'donuts123')
      expect(secret).not.toBeNull()
      expect(typeof secret).toBe('string')
      expect(secret!.length).toBeGreaterThan(0)
    }, 30_000)
  })
})
