import { describe, it, expect, mock } from 'bun:test'
import { areCookiesValid, parse2faDeliveryMethods } from '../login'
import { MyChartRequest } from '../myChartRequest'

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
