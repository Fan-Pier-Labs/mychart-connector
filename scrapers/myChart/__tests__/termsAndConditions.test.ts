import { describe, it, expect, mock } from 'bun:test'
import { MyChartRequest } from '../myChartRequest'
import { acceptTermsAndConditions } from '../termsAndConditions'

/**
 * Helper to create a MyChartRequest with a mocked fetchWithCookieJar.
 * The mock function receives the URL and config, so tests can assert
 * which URLs are called and return appropriate responses.
 */
function createMockRequest(hostname = 'ucsfmychart.ucsfmedicalcenter.org', firstPathPart = 'UCSFMyChart') {
  const req = new MyChartRequest(hostname)
  req.firstPathPart = firstPathPart
  return req
}

/** Build a minimal T&C page with a form, CSRF token, and hidden fields */
function buildTermsPage({
  formAction = '',
  csrfToken = 'test-csrf-token',
  extraHiddenFields = {} as Record<string, string>,
} = {}) {
  const hiddenFields = Object.entries({ __RequestVerificationToken: csrfToken, ...extraHiddenFields })
    .map(([name, value]) => `<input type="hidden" name="${name}" value="${value}" />`)
    .join('\n')
  return `<html><body>
    <h1>Terms and Conditions</h1>
    <form action="${formAction}">
      ${hiddenFields}
      <button type="submit">Accept</button>
    </form>
  </body></html>`
}

describe('acceptTermsAndConditions', () => {

  describe('fallback POST path uses firstPathPart', () => {
    it('POSTs to path with firstPathPart when form has no action', async () => {
      const req = createMockRequest()
      const calledUrls: string[] = []

      req.fetchWithCookieJar = mock(async (url: string) => {
        calledUrls.push(url)
        // First call: GET the T&C page (form with no action)
        if (calledUrls.length === 1) {
          return new Response(buildTermsPage({ formAction: '' }), {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          })
        }
        // Second call: POST to accept T&C — return home page (success)
        return new Response('<html><body>md_home_index</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      }) as typeof req.fetchWithCookieJar

      const result = await acceptTermsAndConditions(req)
      expect(result).toBe(true)

      // The POST URL should include the firstPathPart
      expect(calledUrls.length).toBe(2)
      expect(calledUrls[1]).toContain('/UCSFMyChart/Authentication/TermsConditions')
    })

    it('POSTs to path with firstPathPart when form action is "#"', async () => {
      const req = createMockRequest()
      const calledUrls: string[] = []

      req.fetchWithCookieJar = mock(async (url: string) => {
        calledUrls.push(url)
        if (calledUrls.length === 1) {
          return new Response(buildTermsPage({ formAction: '#' }), {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          })
        }
        return new Response('<html><body>Home page</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      }) as typeof req.fetchWithCookieJar

      const result = await acceptTermsAndConditions(req)
      expect(result).toBe(true)
      expect(calledUrls[1]).toContain('/UCSFMyChart/Authentication/TermsConditions')
    })

    it('does NOT double-prepend firstPathPart when form action already includes it', async () => {
      const req = createMockRequest()
      const calledUrls: string[] = []

      req.fetchWithCookieJar = mock(async (url: string) => {
        calledUrls.push(url)
        if (calledUrls.length === 1) {
          // Form action from the real page already includes firstPathPart
          return new Response(buildTermsPage({ formAction: '/UCSFMyChart/Authentication/TermsConditions' }), {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          })
        }
        return new Response('<html><body>Home page</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      }) as typeof req.fetchWithCookieJar

      const result = await acceptTermsAndConditions(req)
      expect(result).toBe(true)
      // Should use absolute URL construction, not double-prepend
      expect(calledUrls[1]).toContain('/UCSFMyChart/Authentication/TermsConditions')
      expect(calledUrls[1]).not.toContain('/UCSFMyChart/UCSFMyChart/')
    })
  })

  describe('POST includes CSRF token and hidden fields', () => {
    it('sends all hidden form fields in POST body', async () => {
      const req = createMockRequest()
      let postBody = ''

      req.fetchWithCookieJar = mock(async (_url: string, config: Record<string, string>) => {
        if (config?.method === 'POST') {
          postBody = config.body
        }
        if (!config?.method || config.method === 'GET') {
          return new Response(buildTermsPage({
            csrfToken: 'my-csrf-token',
            extraHiddenFields: { '__NavigationRequestMetrics': 'nav-metrics-value' },
          }), { status: 200 })
        }
        return new Response('<html><body>Home</body></html>', { status: 200 })
      }) as typeof req.fetchWithCookieJar

      await acceptTermsAndConditions(req)
      expect(postBody).toContain('__RequestVerificationToken=my-csrf-token')
      expect(postBody).toContain('__NavigationRequestMetrics=nav-metrics-value')
    })
  })

  describe('returns false when CSRF token is missing', () => {
    it('returns false if page has no __RequestVerificationToken', async () => {
      const req = createMockRequest()

      req.fetchWithCookieJar = mock(async () => {
        return new Response('<html><body><h1>Terms</h1><form></form></body></html>', {
          status: 200,
        })
      }) as typeof req.fetchWithCookieJar

      const result = await acceptTermsAndConditions(req)
      expect(result).toBe(false)
    })
  })

  describe('success detection', () => {
    it('returns true when POST response URL does not contain termsconditions', async () => {
      const req = createMockRequest()
      let callCount = 0

      req.fetchWithCookieJar = mock(async () => {
        callCount++
        if (callCount === 1) {
          return new Response(buildTermsPage(), { status: 200 })
        }
        // POST response: landed on Home (no termsconditions in URL or body)
        return new Response('<html><body>Welcome Home</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      }) as typeof req.fetchWithCookieJar

      expect(await acceptTermsAndConditions(req)).toBe(true)
    })

    it('returns false when POST response still contains termsconditions', async () => {
      const req = createMockRequest()
      let callCount = 0

      req.fetchWithCookieJar = mock(async () => {
        callCount++
        if (callCount === 1) {
          return new Response(buildTermsPage(), { status: 200 })
        }
        // POST response: still on T&C page (no accept links either)
        // Must include "termsconditions" (one word) since that's what the success check looks for
        return new Response('<html><body><h1>termsconditions</h1><p>You must accept.</p></body></html>', { status: 200 })
      }) as typeof req.fetchWithCookieJar

      expect(await acceptTermsAndConditions(req)).toBe(false)
    })
  })

  describe('accept link fallback', () => {
    it('follows accept links when POST does not clear T&C page', async () => {
      const req = createMockRequest()
      let callCount = 0
      const calledUrls: string[] = []

      req.fetchWithCookieJar = mock(async (requestUrl: string) => {
        callCount++
        calledUrls.push(requestUrl)
        if (callCount === 1) {
          // GET T&C page
          return new Response(buildTermsPage(), { status: 200 })
        }
        if (callCount === 2) {
          // POST failed — still on T&C page with an accept link
          return new Response(`<html><body>
            <h1>termsconditions</h1>
            <a href="/UCSFMyChart/Authentication/AcceptTerms">I Accept</a>
          </body></html>`, { status: 200 })
        }
        // Following the accept link — success
        return new Response('<html><body>Welcome Home</body></html>', { status: 200 })
      }) as typeof req.fetchWithCookieJar

      expect(await acceptTermsAndConditions(req)).toBe(true)
      expect(calledUrls.length).toBe(3)
      expect(calledUrls[2]).toContain('/UCSFMyChart/Authentication/AcceptTerms')
    })
  })
})
