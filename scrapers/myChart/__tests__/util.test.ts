import { describe, it, expect } from 'bun:test'
import { MISSING_DATE, getRequestVerificationTokenFromBody, parseMyChartDate, sortNewestFirstByDate } from '../util'

describe('getRequestVerificationTokenFromBody', () => {
  it('extracts token from a standard hidden input', () => {
    const html = `
      <html>
        <body>
          <form>
            <input name="__RequestVerificationToken" type="hidden" value="CfDJ8ABC123XYZ" />
            <input type="submit" />
          </form>
        </body>
      </html>
    `
    expect(getRequestVerificationTokenFromBody(html)).toBe('CfDJ8ABC123XYZ')
  })

  it('extracts token when there are multiple form inputs', () => {
    const html = `
      <form>
        <input name="username" value="john" />
        <input name="__RequestVerificationToken" type="hidden" value="token_abc_def_456" />
        <input name="password" type="password" />
      </form>
    `
    expect(getRequestVerificationTokenFromBody(html)).toBe('token_abc_def_456')
  })

  it('returns first token when multiple tokens exist', () => {
    const html = `
      <form>
        <input name="__RequestVerificationToken" value="first_token" />
      </form>
      <form>
        <input name="__RequestVerificationToken" value="second_token" />
      </form>
    `
    expect(getRequestVerificationTokenFromBody(html)).toBe('first_token')
  })

  it('returns undefined when no token input exists', () => {
    const html = `
      <html>
        <body>
          <form>
            <input name="username" value="john" />
          </form>
        </body>
      </html>
    `
    expect(getRequestVerificationTokenFromBody(html)).toBeUndefined()
  })

  it('returns undefined for empty HTML', () => {
    expect(getRequestVerificationTokenFromBody('')).toBeUndefined()
  })

  it('returns undefined when input has no value attribute', () => {
    const html = `<input name="__RequestVerificationToken" />`
    expect(getRequestVerificationTokenFromBody(html)).toBeUndefined()
  })

  it('returns undefined when input value is empty string', () => {
    const html = `<input name="__RequestVerificationToken" value="" />`
    expect(getRequestVerificationTokenFromBody(html)).toBeUndefined()
  })

  it('handles token with special characters', () => {
    const html = `<input name="__RequestVerificationToken" value="CfDJ8N+/=abc123" />`
    expect(getRequestVerificationTokenFromBody(html)).toBe('CfDJ8N+/=abc123')
  })

  it('handles self-closing and non-self-closing input tags', () => {
    const html1 = `<input name="__RequestVerificationToken" value="token1" />`
    const html2 = `<input name="__RequestVerificationToken" value="token2">`
    expect(getRequestVerificationTokenFromBody(html1)).toBe('token1')
    expect(getRequestVerificationTokenFromBody(html2)).toBe('token2')
  })

  it('handles deeply nested token inputs', () => {
    const html = `
      <html>
        <body>
          <div class="container">
            <div class="wrapper">
              <form id="login">
                <div class="form-group">
                  <input name="__RequestVerificationToken" type="hidden" value="deeply_nested_token" />
                </div>
              </form>
            </div>
          </div>
        </body>
      </html>
    `
    expect(getRequestVerificationTokenFromBody(html)).toBe('deeply_nested_token')
  })

  it('handles realistic MyChart CSRF token page', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>MyChart - Login</title></head>
      <body>
        <div id="loginForm">
          <form action="/MyChart/Authentication/Login/DoLogin" method="post">
            <input name="__RequestVerificationToken" type="hidden" value="CfDJ8Nzj4kHs2JKxMqR7vL9pW3bY6tA5fE1dG0cB8iH" />
            <input id="DeviceId" name="DeviceId" type="hidden" value="" />
            <label for="Username">Username</label>
            <input id="Username" name="Username" type="text" />
            <label for="Password">Password</label>
            <input id="Password" name="Password" type="password" />
            <button type="submit">Sign In</button>
          </form>
        </div>
      </body>
      </html>
    `
    expect(getRequestVerificationTokenFromBody(html)).toBe('CfDJ8Nzj4kHs2JKxMqR7vL9pW3bY6tA5fE1dG0cB8iH')
  })
})

describe('parseMyChartDate', () => {
  it('returns MISSING_DATE for null', () => {
    expect(parseMyChartDate(null)).toBe(MISSING_DATE)
  })
  it('returns MISSING_DATE for undefined', () => {
    expect(parseMyChartDate(undefined)).toBe(MISSING_DATE)
  })
  it('returns MISSING_DATE for empty string', () => {
    expect(parseMyChartDate('')).toBe(MISSING_DATE)
  })
  it('returns MISSING_DATE for unparseable garbage', () => {
    expect(parseMyChartDate('pending')).toBe(MISSING_DATE)
    expect(parseMyChartDate('not a date')).toBe(MISSING_DATE)
  })
  it('MISSING_DATE sorts before any real date in newest-first', () => {
    // Pre-1970 negative timestamp must still sort newer than undated.
    const epoch = Date.parse('1969-01-01T00:00:00Z')
    expect(epoch).toBeLessThan(0)
    expect(epoch).toBeGreaterThan(MISSING_DATE)
  })
  it('parses ISO 8601 with timezone offset', () => {
    expect(parseMyChartDate('2026-05-12T20:56:00-04:00')).toBe(Date.parse('2026-05-12T20:56:00-04:00'))
  })
  it('parses ISO 8601 UTC', () => {
    expect(parseMyChartDate('2026-05-12T20:56:00Z')).toBe(Date.parse('2026-05-12T20:56:00Z'))
  })
  it('parses MyChart human display format', () => {
    // V8/JSC accept this; ECMA-262 does not require it but the runtime does.
    const ms = parseMyChartDate('May 12, 2026 8:56 PM')
    expect(ms).toBeGreaterThan(0)
    expect(ms).toBe(Date.parse('May 12, 2026 8:56 PM'))
  })
  it('parses MM/DD/YYYY display format', () => {
    expect(parseMyChartDate('05/12/2026')).toBeGreaterThan(0)
  })
})

describe('sortNewestFirstByDate', () => {
  it('sorts items newest-first by key fn', () => {
    const items = [
      { id: 'a', t: 1000 },
      { id: 'b', t: 3000 },
      { id: 'c', t: 2000 },
    ]
    sortNewestFirstByDate(items, x => x.t)
    expect(items.map(x => x.id)).toEqual(['b', 'c', 'a'])
  })
  it('places MISSING_DATE items last', () => {
    const items = [
      { id: 'undated', t: MISSING_DATE },
      { id: 'newest', t: 2000 },
      { id: 'older', t: 1000 },
    ]
    sortNewestFirstByDate(items, x => x.t)
    expect(items.map(x => x.id)).toEqual(['newest', 'older', 'undated'])
  })
  it('places MISSING_DATE items after pre-1970 negative timestamps', () => {
    const items = [
      { id: 'undated', t: MISSING_DATE },
      { id: 'pre-epoch', t: Date.parse('1969-01-01T00:00:00Z') },
      { id: 'recent', t: Date.parse('2026-05-12T00:00:00Z') },
    ]
    sortNewestFirstByDate(items, x => x.t)
    expect(items.map(x => x.id)).toEqual(['recent', 'pre-epoch', 'undated'])
  })
  it('mutates the input array in place and returns it', () => {
    const items = [
      { id: 'a', t: 1 },
      { id: 'b', t: 2 },
    ]
    const result = sortNewestFirstByDate(items, x => x.t)
    expect(result).toBe(items)
    expect(items.map(x => x.id)).toEqual(['b', 'a'])
  })
  it('preserves stable order for ties', () => {
    const items = [
      { id: 'a', t: 100 },
      { id: 'b', t: 100 },
      { id: 'c', t: 100 },
    ]
    sortNewestFirstByDate(items, x => x.t)
    expect(items.map(x => x.id)).toEqual(['a', 'b', 'c'])
  })
})
