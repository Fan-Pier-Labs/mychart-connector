import { describe, it, expect, mock } from 'bun:test'
import { MyChartRequest } from '../myChartRequest'

describe('MyChartRequest', () => {
  describe('constructor', () => {
    it('sets hostname', () => {
      const req = new MyChartRequest('mychart.example.com')
      expect(req.hostname).toBe('mychart.example.com')
    })

    it('initializes firstPathPart as empty string', () => {
      const req = new MyChartRequest('mychart.example.com')
      expect(req.firstPathPart).toBe('')
    })

    it('creates a cookie jar', () => {
      const req = new MyChartRequest('mychart.example.com')
      expect(req.cookieJar).toBeDefined()
    })

    it('creates a fetchWithCookieJar function', () => {
      const req = new MyChartRequest('mychart.example.com')
      expect(typeof req.fetchWithCookieJar).toBe('function')
    })

    it('strips https:// prefix from hostname', () => {
      const req = new MyChartRequest('https://mychart.example.com')
      expect(req.hostname).toBe('mychart.example.com')
    })

    it('strips full URL with path to just hostname', () => {
      const req = new MyChartRequest('https://mychart.example.com/MyChart/Home')
      expect(req.hostname).toBe('mychart.example.com')
    })

    it('strips http:// prefix from hostname', () => {
      const req = new MyChartRequest('http://mychart.example.com')
      expect(req.hostname).toBe('mychart.example.com')
    })

    it('trims whitespace from hostname', () => {
      const req = new MyChartRequest('  mychart.example.com  ')
      expect(req.hostname).toBe('mychart.example.com')
    })

    it('leaves bare hostname unchanged', () => {
      const req = new MyChartRequest('mychart.example.com')
      expect(req.hostname).toBe('mychart.example.com')
    })
  })

  describe('setFirstPathPart', () => {
    it('sets the first path part', () => {
      const req = new MyChartRequest('mychart.example.com')
      req.setFirstPathPart('MyChart')
      expect(req.firstPathPart).toBe('MyChart')
    })

    it('can be updated multiple times', () => {
      const req = new MyChartRequest('mychart.example.com')
      req.setFirstPathPart('MyChart')
      req.setFirstPathPart('MyChart-PRD')
      expect(req.firstPathPart).toBe('MyChart-PRD')
    })
  })

  describe('makeRequest', () => {
    it('throws when neither url nor path is provided', async () => {
      const req = new MyChartRequest('mychart.example.com')
      await expect(req.makeRequest({})).rejects.toThrow(
        'Either url or path must be defined'
      )
    })

    it('constructs URL from hostname + firstPathPart + path', async () => {
      const req = new MyChartRequest('mychart.example.com')
      req.setFirstPathPart('MyChart')

      let capturedUrl = ''
      req.fetchWithCookieJar = mock(async (url: string | URL | Request) => {
        capturedUrl = url.toString()
        return new Response('', { status: 200 })
      }) as typeof req.fetchWithCookieJar

      await req.makeRequest({ path: '/Home' })
      expect(capturedUrl).toBe('https://mychart.example.com/MyChart/Home')
    })

    it('uses url directly when provided instead of building from path', async () => {
      const req = new MyChartRequest('mychart.example.com')
      req.setFirstPathPart('MyChart')

      let capturedUrl = ''
      req.fetchWithCookieJar = mock(async (url: string | URL | Request) => {
        capturedUrl = url.toString()
        return new Response('', { status: 200 })
      }) as typeof req.fetchWithCookieJar

      await req.makeRequest({ url: 'https://other.com/custom/path' })
      expect(capturedUrl).toBe('https://other.com/custom/path')
    })

    it('defaults to GET method', async () => {
      const req = new MyChartRequest('mychart.example.com')

      let capturedConfig: RequestInit | undefined
      req.fetchWithCookieJar = mock(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedConfig = init
        return new Response('', { status: 200 })
      }) as typeof req.fetchWithCookieJar

      await req.makeRequest({ path: '/Home' })
      expect(capturedConfig?.method).toBe('GET')
    })

    it('sends Chrome-like user agent header', async () => {
      const req = new MyChartRequest('mychart.example.com')

      let capturedHeaders: Record<string, string> = {}
      req.fetchWithCookieJar = mock(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedHeaders = init?.headers as Record<string, string>
        return new Response('', { status: 200 })
      }) as typeof req.fetchWithCookieJar

      await req.makeRequest({ path: '/Home' })
      expect(capturedHeaders['User-Agent']).toContain('Chrome')
      expect(capturedHeaders['User-Agent']).toContain('Mozilla')
    })

    it('merges custom headers with defaults', async () => {
      const req = new MyChartRequest('mychart.example.com')

      let capturedHeaders: Record<string, string> = {}
      req.fetchWithCookieJar = mock(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedHeaders = init?.headers as Record<string, string>
        return new Response('', { status: 200 })
      }) as typeof req.fetchWithCookieJar

      await req.makeRequest({
        path: '/Home',
        headers: { 'X-Custom': 'value', '__RequestVerificationToken': 'abc' }
      })
      expect(capturedHeaders['X-Custom']).toBe('value')
      expect(capturedHeaders['__RequestVerificationToken']).toBe('abc')
      expect(capturedHeaders['User-Agent']).toBeDefined()
    })

    it('custom headers override defaults', async () => {
      const req = new MyChartRequest('mychart.example.com')

      let capturedHeaders: Record<string, string> = {}
      req.fetchWithCookieJar = mock(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedHeaders = init?.headers as Record<string, string>
        return new Response('', { status: 200 })
      }) as typeof req.fetchWithCookieJar

      await req.makeRequest({
        path: '/Home',
        headers: { 'User-Agent': 'custom-agent' }
      })
      expect(capturedHeaders['User-Agent']).toBe('custom-agent')
    })

    it('sets redirect to manual', async () => {
      const req = new MyChartRequest('mychart.example.com')

      let capturedConfig: RequestInit | undefined
      req.fetchWithCookieJar = mock(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedConfig = init
        return new Response('', { status: 200 })
      }) as typeof req.fetchWithCookieJar

      await req.makeRequest({ path: '/Home' })
      expect(capturedConfig?.redirect).toBe('manual')
    })

    it('follows 302 redirects by default', async () => {
      const req = new MyChartRequest('mychart.example.com')
      const calls: string[] = []

      req.fetchWithCookieJar = mock(async (url: string | URL | Request) => {
        calls.push(url.toString())
        if (calls.length === 1) {
          return new Response('', {
            status: 302,
            headers: { 'Location': 'https://mychart.example.com/MyChart/Home' }
          })
        }
        return new Response('Final page', { status: 200 })
      }) as typeof req.fetchWithCookieJar

      const resp = await req.makeRequest({ path: '/Login' })
      expect(calls).toHaveLength(2)
      expect(calls[1]).toBe('https://mychart.example.com/MyChart/Home')
      expect(await resp.text()).toBe('Final page')
    })

    it('follows 301 redirects by default', async () => {
      const req = new MyChartRequest('mychart.example.com')
      const calls: string[] = []

      req.fetchWithCookieJar = mock(async (url: string | URL | Request) => {
        calls.push(url.toString())
        if (calls.length === 1) {
          return new Response('', {
            status: 301,
            headers: { 'Location': '/new-location' }
          })
        }
        return new Response('Redirected', { status: 200 })
      }) as typeof req.fetchWithCookieJar

      await req.makeRequest({ path: '/old' })
      expect(calls).toHaveLength(2)
    })

    it('does not follow redirects when followRedirects is false', async () => {
      const req = new MyChartRequest('mychart.example.com')
      const calls: string[] = []

      req.fetchWithCookieJar = mock(async (url: string | URL | Request) => {
        calls.push(url.toString())
        return new Response('', {
          status: 302,
          headers: { 'Location': '/somewhere' }
        })
      }) as typeof req.fetchWithCookieJar

      const resp = await req.makeRequest({ path: '/test', followRedirects: false })
      expect(calls).toHaveLength(1)
      expect(resp.status).toBe(302)
    })

    it('throws when redirect has no Location header', async () => {
      const req = new MyChartRequest('mychart.example.com')

      req.fetchWithCookieJar = mock(async () => {
        return new Response('', { status: 302 })
      }) as typeof req.fetchWithCookieJar

      await expect(req.makeRequest({ path: '/test' })).rejects.toThrow(
        "302 didn't have a location header"
      )
    })

    it('switches to GET and drops body on redirect', async () => {
      const req = new MyChartRequest('mychart.example.com')
      const capturedConfigs: RequestInit[] = []

      req.fetchWithCookieJar = mock(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedConfigs.push(init!)
        if (capturedConfigs.length === 1) {
          return new Response('', {
            status: 302,
            headers: { 'Location': '/redirected' }
          })
        }
        return new Response('OK', { status: 200 })
      }) as typeof req.fetchWithCookieJar

      await req.makeRequest({ path: '/submit', method: 'POST', body: 'data=123' })
      expect(capturedConfigs[0].method).toBe('POST')
      expect(capturedConfigs[0].body).toBe('data=123')
      expect(capturedConfigs[1].method).toBe('GET')
      expect(capturedConfigs[1].body).toBeUndefined()
    })

    it('auto-sets Content-Type to application/json for POST with body', async () => {
      const req = new MyChartRequest('mychart.example.com')

      let capturedHeaders: Record<string, string> = {}
      req.fetchWithCookieJar = mock(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedHeaders = init?.headers as Record<string, string>
        return new Response('', { status: 200 })
      }) as typeof req.fetchWithCookieJar

      await req.makeRequest({ path: '/api', method: 'POST', body: '{"key":"val"}' })
      expect(capturedHeaders['Content-Type']).toBe('application/json')
    })

    it('does not override explicit Content-Type', async () => {
      const req = new MyChartRequest('mychart.example.com')

      let capturedHeaders: Record<string, string> = {}
      req.fetchWithCookieJar = mock(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedHeaders = init?.headers as Record<string, string>
        return new Response('', { status: 200 })
      }) as typeof req.fetchWithCookieJar

      await req.makeRequest({
        path: '/api',
        method: 'POST',
        body: 'field=value',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      expect(capturedHeaders['Content-Type']).toBe('application/x-www-form-urlencoded')
    })
  })

  describe('serialization', () => {
    it('serializes and unserializes a request', async () => {
      const req = new MyChartRequest('mychart.example.com')
      req.setFirstPathPart('MyChart')

      const serialized = await req.serialize()
      const parsed = JSON.parse(serialized)
      expect(parsed.hostname).toBe('mychart.example.com')
      expect(parsed.firstPathPart).toBe('MyChart')
      expect(parsed.cookies).toBeDefined()
    })

    it('unserializes back to a working MyChartRequest', async () => {
      const req = new MyChartRequest('test.example.com')
      req.setFirstPathPart('MyChart-PRD')

      const serialized = await req.serialize()
      const restored = await MyChartRequest.unserialize(serialized)
      expect(restored).not.toBeNull()
      expect(restored!.hostname).toBe('test.example.com')
      expect(restored!.firstPathPart).toBe('MyChart-PRD')
      expect(typeof restored!.fetchWithCookieJar).toBe('function')
    })
  })
})
