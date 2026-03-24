import { describe, it, expect, mock } from 'bun:test'
import { areCookiesValid, parse2faDeliveryMethods } from '../login'
import { MyChartRequest } from '../myChartRequest'

/**
 * The T&C detection condition used in login.ts (post-login and post-2FA):
 *   urlLower.includes('termsconditions') || (bodyLower.includes('terms and conditions') && !urlLower.includes('/home'))
 *
 * We test the condition logic directly here since it's not extracted into a function.
 */
function shouldDetectTermsAndConditions(url: string, body: string): boolean {
  const urlLower = url.toLowerCase()
  const bodyLower = body.toLowerCase()
  return urlLower.includes('termsconditions') || (bodyLower.includes('terms and conditions') && !urlLower.includes('/home'))
}

describe('T&C detection logic', () => {
  it('detects T&C when URL contains termsconditions', () => {
    expect(shouldDetectTermsAndConditions(
      'https://ucsfmychart.ucsfmedicalcenter.org/UCSFMyChart/Authentication/TermsConditions',
      '<html><body>Please accept</body></html>'
    )).toBe(true)
  })

  it('detects T&C when body contains "terms and conditions" and URL is not Home', () => {
    expect(shouldDetectTermsAndConditions(
      'https://ucsfmychart.ucsfmedicalcenter.org/UCSFMyChart/Authentication/Login',
      '<html><body>Please accept the Terms and Conditions</body></html>'
    )).toBe(true)
  })

  it('does NOT detect T&C when Home page body mentions termsconditions in asset URLs', () => {
    // This is the false positive that caused the UCSF bug — Home page references
    // "termsconditions" in CSS/JS URLs but is not actually the T&C page
    const homePage = `<html><head>
      <link rel="stylesheet" href="/UCSFMyChart/en-us/styles/common.css" />
      <script src="/UCSFMyChart/areas/authentication/scripts/termsconditions.min.js"></script>
    </head><body>Welcome Home</body></html>`
    expect(shouldDetectTermsAndConditions(
      'https://ucsfmychart.ucsfmedicalcenter.org/UCSFMyChart/Home/',
      homePage
    )).toBe(false)
  })

  it('does NOT detect T&C on Home page even if body has "terms and conditions" text', () => {
    // Footer link on home page saying "Terms and Conditions" should not trigger
    const homePage = `<html><body>
      <div>Welcome Home</div>
      <footer><a href="/terms">Terms and Conditions</a></footer>
    </body></html>`
    expect(shouldDetectTermsAndConditions(
      'https://ucsfmychart.ucsfmedicalcenter.org/UCSFMyChart/Home/',
      homePage
    )).toBe(false)
  })

  it('does NOT detect T&C on normal pages without any T&C references', () => {
    expect(shouldDetectTermsAndConditions(
      'https://ucsfmychart.ucsfmedicalcenter.org/UCSFMyChart/Home/',
      '<html><body>md_home_index</body></html>'
    )).toBe(false)
  })

  it('detects T&C when URL has termsconditions even on /home path', () => {
    // Edge case: URL itself contains termsconditions — always detect
    expect(shouldDetectTermsAndConditions(
      'https://example.com/MyChart/Authentication/TermsConditions?redirect=/home',
      '<html><body>Accept terms</body></html>'
    )).toBe(true)
  })
})

describe('areCookiesValid', () => {
  it('returns true when response is 200', async () => {
    const req = new MyChartRequest('mychart.example.com')
    req.firstPathPart = 'MyChart'
    req.fetchWithCookieJar = mock(async () => {
      return new Response('Home page', { status: 200 })
    }) as typeof req.fetchWithCookieJar

    expect(await areCookiesValid(req)).toBe(true)
  })

  it('returns false when response is 302 redirect', async () => {
    const req = new MyChartRequest('mychart.example.com')
    req.firstPathPart = 'MyChart'
    req.fetchWithCookieJar = mock(async () => {
      return new Response('', {
        status: 302,
        headers: { 'Location': '/MyChart/Authentication/Login' }
      })
    }) as typeof req.fetchWithCookieJar

    expect(await areCookiesValid(req)).toBe(false)
  })
})

describe('parse2faDeliveryMethods', () => {
  it('detects SMS-only when page has only "Text to my phone" button', () => {
    const html = `<html><body>
      <div>secondaryvalidationcontroller</div>
      <button>Text to my phone</button>
    </body></html>`
    const result = parse2faDeliveryMethods(html)
    expect(result.hasEmail).toBe(false)
    expect(result.hasSms).toBe(true)
  })

  it('detects email-only when page has only "Email to me" button', () => {
    const html = `<html><body>
      <div>secondaryvalidationcontroller</div>
      <button>Email to me</button>
    </body></html>`
    const result = parse2faDeliveryMethods(html)
    expect(result.hasEmail).toBe(true)
    expect(result.hasSms).toBe(false)
  })

  it('detects both email and SMS when both buttons present', () => {
    const html = `<html><body>
      <div>secondaryvalidationcontroller</div>
      <button>Email to me</button>
      <button>Text to my phone</button>
    </body></html>`
    const result = parse2faDeliveryMethods(html)
    expect(result.hasEmail).toBe(true)
    expect(result.hasSms).toBe(true)
  })

  it('detects neither when no delivery method buttons found', () => {
    const html = `<html><body>
      <div>secondaryvalidationcontroller</div>
      <p>Enter your code</p>
    </body></html>`
    const result = parse2faDeliveryMethods(html)
    expect(result.hasEmail).toBe(false)
    expect(result.hasSms).toBe(false)
  })

  it('extracts masked phone number from page text', () => {
    const html = `<html><body>
      <button>Text to my phone</button>
      <div>We've sent a security code to ***-***-7204.</div>
    </body></html>`
    const result = parse2faDeliveryMethods(html)
    expect(result.hasSms).toBe(true)
    expect(result.smsContact).toBe('***-***-7204')
  })

  it('extracts masked email from page text', () => {
    const html = `<html><body>
      <button>Email to me</button>
      <div>Code sent to ry***@gmail.com</div>
    </body></html>`
    const result = parse2faDeliveryMethods(html)
    expect(result.hasEmail).toBe(true)
    expect(result.emailContact).toBe('ry***@gmail.com')
  })

  it('handles case-insensitive button text', () => {
    const html = `<html><body>
      <button>EMAIL ME A CODE</button>
      <button>TEXT MY PHONE</button>
    </body></html>`
    const result = parse2faDeliveryMethods(html)
    expect(result.hasEmail).toBe(true)
    expect(result.hasSms).toBe(true)
  })

  it('detects SMS from button with "sms" keyword', () => {
    const html = `<html><body>
      <button>Send SMS code</button>
    </body></html>`
    const result = parse2faDeliveryMethods(html)
    expect(result.hasSms).toBe(true)
  })
})
