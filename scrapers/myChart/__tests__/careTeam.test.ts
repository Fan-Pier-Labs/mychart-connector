import { describe, it, expect, mock } from 'bun:test'
import { getCareTeam } from '../careTeam'
import { MyChartRequest } from '../myChartRequest'

function mockRequest(body: string) {
  const req = new MyChartRequest('mychart.example.com')
  req.firstPathPart = 'MyChart'
  req.fetchWithCookieJar = mock(async () => {
    return new Response(body, { status: 200 })
  }) as typeof req.fetchWithCookieJar
  return req
}

/** Mock that returns different responses per path */
function mockRequestByPath(responses: Record<string, string>) {
  const req = new MyChartRequest('mychart.example.com')
  req.firstPathPart = 'MyChart'
  req.fetchWithCookieJar = mock(async (url: string) => {
    for (const [pathFragment, body] of Object.entries(responses)) {
      if (url.includes(pathFragment)) {
        return new Response(body, { status: 200 })
      }
    }
    return new Response('', { status: 404 })
  }) as typeof req.fetchWithCookieJar
  return req
}

describe('getCareTeam', () => {
  it('parses care team from structured HTML with provider cards', async () => {
    const html = `
      <html><body>
        <div class="careteam-provider">
          <h3 class="provider-name">Dr. Alice Smith, MD</h3>
          <span class="provider-role">Primary Care Provider</span>
          <span class="provider-specialty">Internal Medicine</span>
        </div>
        <div class="careteam-provider">
          <h3 class="provider-name">Dr. Bob Jones, DO</h3>
          <span class="provider-role">Specialist</span>
          <span class="provider-specialty">Cardiology</span>
        </div>
      </body></html>
    `
    const result = await getCareTeam(mockRequest(html))
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ name: 'Dr. Alice Smith, MD', role: 'Primary Care Provider', specialty: 'Internal Medicine' })
    expect(result[1]).toEqual({ name: 'Dr. Bob Jones, DO', role: 'Specialist', specialty: 'Cardiology' })
  })

  it('parses care team from data-testid elements', async () => {
    const html = `
      <div data-testid="care-team-member">
        <h4>Jane Doe, NP</h4>
        <span class="role">Nurse Practitioner</span>
        <span class="specialty">Family Medicine</span>
      </div>
    `
    const result = await getCareTeam(mockRequest(html))
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Jane Doe, NP')
  })

  it('falls back to API when HTML has no structured care team data', async () => {
    // Page with a verification token but no care team HTML (like UCSF)
    const pageHtml = `
      <html><body>
        <input name="__RequestVerificationToken" value="test-token-123" />
        <script>$$WP.Strings.addMnemonic("@MYCHART@PCP@",HTMLUnencode("Dr. Test"), false, "Global");</script>
      </body></html>
    `
    const apiJson = JSON.stringify([
      { displayName: 'Eric J Acay, NP', pcpTypeDisplayName: 'Primary Care Provider', specialty: 'Family Medicine' },
      { displayName: 'Dr. Sarah Wilson, MD', pcpTypeDisplayName: '', specialty: 'Internal Medicine' },
    ])
    const req = mockRequestByPath({
      'Clinical/CareTeam': pageHtml,
      'GetMedicalAdviceRequestRecipients': apiJson,
    })
    const result = await getCareTeam(req)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ name: 'Eric J Acay, NP', role: 'Primary Care Provider', specialty: 'Family Medicine' })
    expect(result[1]).toEqual({ name: 'Dr. Sarah Wilson, MD', role: '', specialty: 'Internal Medicine' })
  })

  it('handles API returning wrapped object instead of bare array', async () => {
    const pageHtml = `
      <html><body>
        <input name="__RequestVerificationToken" value="tok" />
      </body></html>
    `
    const apiJson = JSON.stringify({
      recipients: [
        { displayName: 'Dr. Bob, MD', specialty: 'Cardiology' },
      ],
    })
    const req = mockRequestByPath({
      'Clinical/CareTeam': pageHtml,
      'GetMedicalAdviceRequestRecipients': apiJson,
    })
    const result = await getCareTeam(req)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ name: 'Dr. Bob, MD', role: '', specialty: 'Cardiology' })
  })

  it('skips elements without a name', async () => {
    const html = `
      <div class="careteam-provider">
        <h3 class="provider-name"></h3>
        <span class="provider-role">Some Role</span>
      </div>
    `
    const result = await getCareTeam(mockRequest(html))
    expect(result).toEqual([])
  })

  it('returns empty array for page with no care team data and no token', async () => {
    const html = '<html><body><p>Welcome to MyChart</p></body></html>'
    const result = await getCareTeam(mockRequest(html))
    expect(result).toEqual([])
  })

  it('returns empty array when API call fails', async () => {
    const pageHtml = `
      <html><body>
        <input name="__RequestVerificationToken" value="tok" />
      </body></html>
    `
    const req = mockRequestByPath({
      'Clinical/CareTeam': pageHtml,
      'GetMedicalAdviceRequestRecipients': 'not json {{{',
    })
    const result = await getCareTeam(req)
    expect(result).toEqual([])
  })
})
