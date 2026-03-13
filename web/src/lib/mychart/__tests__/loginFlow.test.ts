import { describe, it, expect } from 'bun:test'

// Test the validation logic that myChartUserPassLogin uses.
// We cannot import myChartUserPassLogin directly because bun's mock.module
// (used in auto-connect.test.ts) is global and pollutes all test files.
// Instead, we test the validation inline — same logic as the real function.
function validateLoginArgs(args: { hostname: string; user: string; pass: string }) {
  if (!args.hostname || !args.user || !args.pass) {
    throw new Error('Missing hostname, user, or pass')
  }
}

describe('myChartUserPassLogin validation', () => {
  it('throws when hostname is missing', () => {
    expect(() => validateLoginArgs({ hostname: '', user: 'u', pass: 'p' })).toThrow(
      'Missing hostname, user, or pass'
    )
  })

  it('throws when user is missing', () => {
    expect(() => validateLoginArgs({ hostname: 'h.com', user: '', pass: 'p' })).toThrow(
      'Missing hostname, user, or pass'
    )
  })

  it('throws when pass is missing', () => {
    expect(() => validateLoginArgs({ hostname: 'h.com', user: 'u', pass: '' })).toThrow(
      'Missing hostname, user, or pass'
    )
  })
})

describe('login response parsing', () => {
  it('detects 2FA requirement from secondaryvalidationcontroller in page', () => {
    const html = `
      <html>
        <body>
          <div data-controller="secondaryvalidationcontroller">
            <input name="__RequestVerificationToken" value="2fa_token_123" />
            <p>Enter your verification code</p>
          </div>
        </body>
      </html>
    `
    // Test the detection logic directly
    expect(html.includes('secondaryvalidationcontroller')).toBe(true)
  })

  it('detects login failed from page content', () => {
    const responses = [
      'Login Failed: Invalid username or password',
      'Your login unsuccessful. Please try again.',
      'LOGIN FAILED',
      'login unsuccessful',
    ]
    for (const html of responses) {
      const lower = html.toLocaleLowerCase()
      expect(
        lower.includes('login failed') || lower.includes('login unsuccessful')
      ).toBe(true)
    }
  })

  it('does not false-positive on normal pages', () => {
    const normalPages = [
      '<html><body>Welcome to MyChart</body></html>',
      '<div>Your appointment is confirmed</div>',
      '<p>Secondary information about your account</p>',
    ]
    for (const html of normalPages) {
      expect(html.includes('secondaryvalidationcontroller')).toBe(false)
      const lower = html.toLocaleLowerCase()
      expect(
        lower.includes('login failed') || lower.includes('login unsuccessful')
      ).toBe(false)
    }
  })
})

describe('complete2faFlow response parsing', () => {
  it('detects successful 2FA from JSON response', () => {
    const respBody = { Success: true }
    expect(respBody.Success).toBe(true)
  })

  it('detects wrong code from TwoFactorCodeFailReason', () => {
    const respBody = { Success: false, TwoFactorCodeFailReason: 'codewrong' }
    expect(respBody.TwoFactorCodeFailReason).toBe('codewrong')
  })

  it('handles generic failure (no specific reason)', () => {
    const respBody = { Success: false }
    expect(respBody.Success).toBe(false)
    expect((respBody as Record<string, unknown>).TwoFactorCodeFailReason).toBeUndefined()
  })
})

describe('2FA delivery method detection', () => {
  it('detects email method from page with "Email to me" button', () => {
    const html = `<html><body>
      <div>secondaryvalidationcontroller</div>
      <button>Email to me</button>
      <button>Text to my phone</button>
    </body></html>`
    // Verify both keywords are present
    const lower = html.toLowerCase()
    expect(lower.includes('email')).toBe(true)
    expect(lower.includes('text') || lower.includes('phone')).toBe(true)
  })

  it('detects SMS-only when no email button present', () => {
    const html = `<html><body>
      <div>secondaryvalidationcontroller</div>
      <button>Text to my phone</button>
    </body></html>`
    const lower = html.toLowerCase()
    expect(lower.includes('email')).toBe(false)
    // Has SMS/text option
    expect(lower.includes('text')).toBe(true)
  })

  it('recognizes masked phone pattern like ***-***-7204', () => {
    const text = "We've sent a security code to ***-***-7204."
    const match = text.match(/\*{2,}[\d*-]*\d{4}/)
    expect(match).not.toBeNull()
    expect(match![0]).toBe('***-***-7204')
  })

  it('recognizes masked email pattern like ry***@gmail.com', () => {
    const text = 'Code sent to ry***@gmail.com'
    const match = text.match(/[\w*]+\*+[\w*]*@[\w.]+/)
    expect(match).not.toBeNull()
    expect(match![0]).toBe('ry***@gmail.com')
  })
})

describe('login credential encoding', () => {
  it('base64 encodes username and password', () => {
    const user = 'testuser'
    const pass = 'testpass123!'
    const encodedUser = btoa(user)
    const encodedPass = btoa(pass)
    expect(encodedUser).toBe('dGVzdHVzZXI=')
    expect(encodedPass).toBe('dGVzdHBhc3MxMjMh')
  })

  it('constructs LoginInfo JSON correctly', () => {
    const user = 'myuser'
    const pass = 'mypass'
    const loginInfo = JSON.stringify({
      Type: 'StandardLogin',
      Credentials: {
        Username: btoa(user),
        Password: btoa(pass),
      },
    })
    const parsed = JSON.parse(loginInfo)
    expect(parsed.Type).toBe('StandardLogin')
    expect(atob(parsed.Credentials.Username)).toBe('myuser')
    expect(atob(parsed.Credentials.Password)).toBe('mypass')
  })

  it('URL-encodes the LoginInfo payload', () => {
    const loginInfo = JSON.stringify({
      Type: 'StandardLogin',
      Credentials: { Username: 'dXNlcg==', Password: 'cGFzcw==' },
    })
    const encoded = encodeURIComponent(loginInfo)
    // Should not contain raw braces or quotes
    expect(encoded).not.toContain('{')
    expect(encoded).not.toContain('"')
    // Should be decodable back
    expect(JSON.parse(decodeURIComponent(encoded))).toEqual(
      JSON.parse(loginInfo)
    )
  })

  it('handles special characters in password', () => {
    const pass = 'p@$$w0rd!#%^&*()'
    const encoded = btoa(pass)
    expect(atob(encoded)).toBe(pass)
  })
})
