import { describe, it, expect, mock } from 'bun:test'
import { getVisitNotes, getNoteContent, getVisitAVS } from '../notes'
import { MyChartRequest } from '../../myChartRequest'

function mockRequest(responses: Array<{ body: string; contentType?: string; server?: string }>) {
  const req = new MyChartRequest('mychart.example.com')
  req.firstPathPart = 'MyChart'
  let i = 0
  req.fetchWithCookieJar = mock(async () => {
    const r = responses[i++]
    const headers: Record<string, string> = {}
    if (r.contentType !== undefined) headers['content-type'] = r.contentType
    if (r.server !== undefined) headers['server'] = r.server
    return new Response(r.body, { status: 200, headers })
  }) as typeof req.fetchWithCookieJar
  return req
}

describe('getVisitNotes', () => {
  const tokenHtml = '<input name="__RequestVerificationToken" value="csrf_token" />'

  it('returns the notes list and lrpId from the GetVisitNotes API', async () => {
    const apiResponse = {
      lrpID: 'WP-lrp-abc',
      depPhoneNumber: '555-111-2222',
      isAtLeastOneNoteSensitive: false,
      noteList: [
        {
          hnoID: 'WP-hno-1',
          hnoDAT: 'WP-dat-1',
          displayName: 'Anesthesia Procedure Notes',
          iso: '2026-05-11T13:47:52-04:00',
          isAddendum: false,
          isNoteSensitive: false,
          provider: { name: 'Neil Zilberg, MD', magicID: 'WP-mid-1' },
        },
        {
          hnoID: 'WP-hno-2',
          hnoDAT: 'WP-dat-2',
          displayName: 'Operative Note',
          iso: '2026-05-11T16:05:00-04:00',
          isAddendum: false,
          isNoteSensitive: false,
          provider: { name: 'Jonathan J Silver, MD', magicID: 'WP-mid-2' },
        },
      ],
    }

    const req = mockRequest([
      { body: tokenHtml, contentType: 'text/html' },
      { body: JSON.stringify(apiResponse), contentType: 'application/json' },
    ])

    const result = await getVisitNotes(req, 'WP-csn-xyz')
    expect(result.csn).toBe('WP-csn-xyz')
    expect(result.lrpId).toBe('WP-lrp-abc')
    expect(result.depPhoneNumber).toBe('555-111-2222')
    expect(result.notes).toHaveLength(2)
    expect(result.notes[0].hnoId).toBe('WP-hno-1')
    expect(result.notes[0].displayName).toBe('Anesthesia Procedure Notes')
    expect(result.notes[0].providerName).toBe('Neil Zilberg, MD')
    expect(result.notes[1].hnoId).toBe('WP-hno-2')
  })

  it('handles an empty notes list', async () => {
    const req = mockRequest([
      { body: tokenHtml, contentType: 'text/html' },
      { body: JSON.stringify({ lrpID: '', noteList: [] }), contentType: 'application/json' },
    ])
    const result = await getVisitNotes(req, 'WP-csn-empty')
    expect(result.notes).toEqual([])
    expect(result.lrpId).toBe('')
  })

  it('makes a JSON POST with the CSRF token and CSN', async () => {
    const req = new MyChartRequest('mychart.example.com')
    req.firstPathPart = 'MyChart'
    const calls: Array<{ url: string; init?: RequestInit }> = []
    let i = 0
    const responses = [
      { body: tokenHtml, contentType: 'text/html' },
      { body: JSON.stringify({ noteList: [] }), contentType: 'application/json' },
    ]
    req.fetchWithCookieJar = mock(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: url.toString(), init })
      const r = responses[i++]
      return new Response(r.body, { status: 200, headers: { 'content-type': r.contentType } })
    }) as typeof req.fetchWithCookieJar

    await getVisitNotes(req, 'WP-csn-test')

    expect(calls[1].url).toContain('/api/visit-notes/GetVisitNotes')
    expect(calls[1].init?.method).toBe('POST')
    const headers = calls[1].init!.headers as Record<string, string>
    expect(headers['__requestverificationtoken']).toBe('csrf_token')
    expect(headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(calls[1].init!.body as string)).toEqual({
      CSN: 'WP-csn-test',
      FromPvdPage: true,
    })
  })

  it('throws a clear error when the WAF intercepts (text/html "Request Rejected")', async () => {
    const req = mockRequest([
      { body: tokenHtml, contentType: 'text/html' },
      {
        body: '<html><head><title>Request Rejected</title></head><body>Request Rejected</body></html>',
        contentType: 'text/html; charset=UTF-8',
        server: 'volt-adc',
      },
    ])
    await expect(getVisitNotes(req, 'WP-csn-blocked')).rejects.toThrow(/WAF.*rejected/)
  })

  it('throws a clear error when the response is text/html (session expired)', async () => {
    const req = mockRequest([
      { body: tokenHtml, contentType: 'text/html' },
      { body: '<html>login page</html>', contentType: 'text/html' },
    ])
    await expect(getVisitNotes(req, 'WP-csn-nosession')).rejects.toThrow(/Expected JSON/)
  })

  it('throws when CSRF token cannot be found', async () => {
    const req = mockRequest([{ body: '<html>no token here</html>', contentType: 'text/html' }])
    await expect(getVisitNotes(req, 'WP-csn-notoken')).rejects.toThrow(/verification token/)
  })
})

describe('getNoteContent', () => {
  const tokenHtml = '<input name="__RequestVerificationToken" value="csrf_token" />'

  it('returns the rendered HTML and CSS for a note', async () => {
    const apiResponse = {
      reportContent: '<div>Note body</div>',
      reportCss: '.x { color: red; }',
    }
    const req = mockRequest([
      { body: tokenHtml, contentType: 'text/html' },
      { body: JSON.stringify(apiResponse), contentType: 'application/json' },
    ])

    const result = await getNoteContent(req, {
      csn: 'WP-csn-1',
      lrpId: 'WP-lrp-1',
      hnoId: 'WP-hno-1',
      hnoDat: 'WP-dat-1',
    })
    expect(result.contentHtml).toBe('<div>Note body</div>')
    expect(result.contentCss).toBe('.x { color: red; }')
  })

  it('sends the report-content body with all 4 identifiers', async () => {
    const req = new MyChartRequest('mychart.example.com')
    req.firstPathPart = 'MyChart'
    const calls: Array<{ url: string; init?: RequestInit }> = []
    let i = 0
    const responses = [
      { body: tokenHtml, contentType: 'text/html' },
      { body: JSON.stringify({}), contentType: 'application/json' },
    ]
    req.fetchWithCookieJar = mock(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: url.toString(), init })
      const r = responses[i++]
      return new Response(r.body, { status: 200, headers: { 'content-type': r.contentType } })
    }) as typeof req.fetchWithCookieJar

    await getNoteContent(req, {
      csn: 'WP-csn-X',
      lrpId: 'WP-lrp-X',
      hnoId: 'WP-hno-X',
      hnoDat: 'WP-dat-X',
    })

    expect(calls[1].url).toContain('/api/report-content/LoadReportContent')
    const body = JSON.parse(calls[1].init!.body as string)
    expect(body.reportMnemonic).toBe('OPEN_NOTES')
    expect(body.reportID).toBe('WP-lrp-X')
    expect(body.contextID).toBe('WP-hno-X')
    expect(body.contextDAT).toBe('WP-dat-X')
    expect(body.contextINI).toBe('HNO')
    expect(body.csn).toBe('WP-csn-X')
  })

  it('throws on WAF rejection', async () => {
    const req = mockRequest([
      { body: tokenHtml, contentType: 'text/html' },
      {
        body: '<html>Request Rejected</html>',
        contentType: 'text/html; charset=UTF-8',
        server: 'volt-adc',
      },
    ])
    await expect(
      getNoteContent(req, { csn: 'a', lrpId: 'b', hnoId: 'c', hnoDat: 'd' })
    ).rejects.toThrow(/WAF/)
  })
})

describe('getVisitAVS', () => {
  const tokenHtml = '<input name="__RequestVerificationToken" value="csrf_token" />'

  it('returns the AVS HTML', async () => {
    const apiResponse = {
      reportContent: '<div class="avs">After Visit Summary</div>',
      reportCss: '',
    }
    const req = mockRequest([
      { body: tokenHtml, contentType: 'text/html' },
      { body: JSON.stringify(apiResponse), contentType: 'application/json' },
    ])

    const result = await getVisitAVS(req, 'WP-csn-avs')
    expect(result.contentHtml).toContain('After Visit Summary')
  })

  it('sends AMB_AVS mnemonic with empty reportID', async () => {
    const req = new MyChartRequest('mychart.example.com')
    req.firstPathPart = 'MyChart'
    const calls: Array<{ url: string; init?: RequestInit }> = []
    let i = 0
    const responses = [
      { body: tokenHtml, contentType: 'text/html' },
      { body: JSON.stringify({}), contentType: 'application/json' },
    ]
    req.fetchWithCookieJar = mock(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: url.toString(), init })
      const r = responses[i++]
      return new Response(r.body, { status: 200, headers: { 'content-type': r.contentType } })
    }) as typeof req.fetchWithCookieJar

    await getVisitAVS(req, 'WP-csn-avs')

    const body = JSON.parse(calls[1].init!.body as string)
    expect(body.reportMnemonic).toBe('AMB_AVS')
    expect(body.reportID).toBe('')
    expect(body.csn).toBe('WP-csn-avs')
  })
})
