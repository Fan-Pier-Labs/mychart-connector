import { describe, it, expect, mock } from 'bun:test'
import { upcomingVisits, pastVisits } from '../visits'
import { MyChartRequest } from '../../myChartRequest'

function mockRequest(responses: Array<{ body: string }>) {
  const req = new MyChartRequest('mychart.example.com')
  req.firstPathPart = 'MyChart'
  let i = 0
  req.fetchWithCookieJar = mock(async () => {
    const r = responses[i++]
    return new Response(r.body, { status: 200 })
  }) as typeof req.fetchWithCookieJar
  return req
}

describe('upcomingVisits', () => {
  it('returns error when no token found', async () => {
    const req = mockRequest([{ body: '<html></html>' }])
    const result = await upcomingVisits(req)
    expect(result).toEqual({ visits: [], error: 'Authentication error: could not get CSRF token for visits' })
  })

  it('returns upcoming visits data', async () => {
    const visitsData = {
      LaterVisitsList: [
        {
          Date: '03/15/2025',
          Time: '10:30 AM',
          VisitTypeName: 'Annual Physical',
          PrimaryProviderName: 'Dr. Johnson',
          PrimaryDepartment: {
            Name: 'Primary Care',
            Address: ['456 Health Ave', 'Boston, MA 02102'],
          },
        },
      ],
      NextNDaysVisits: [],
      InProgressVisits: [],
    }

    const req = mockRequest([
      { body: '<input name="__RequestVerificationToken" value="csrf_token" />' },
      { body: JSON.stringify(visitsData) },
    ])

    const result = await upcomingVisits(req)
    expect(result.LaterVisitsList).toHaveLength(1)
    expect(result.LaterVisitsList[0].VisitTypeName).toBe('Annual Physical')
    expect(result.LaterVisitsList[0].PrimaryProviderName).toBe('Dr. Johnson')
    expect(result.NextNDaysVisits).toHaveLength(0)
  })

  it('returns visits across all categories', async () => {
    const visitsData = {
      LaterVisitsList: [{ Date: '04/01/2025', VisitTypeName: 'Follow-up' }],
      NextNDaysVisits: [{ Date: '01/20/2025', VisitTypeName: 'Lab Work' }],
      InProgressVisits: [{ Date: '01/15/2025', VisitTypeName: 'Telehealth' }],
    }

    const req = mockRequest([
      { body: '<input name="__RequestVerificationToken" value="tok" />' },
      { body: JSON.stringify(visitsData) },
    ])

    const result = await upcomingVisits(req)
    expect(result.LaterVisitsList).toHaveLength(1)
    expect(result.NextNDaysVisits).toHaveLength(1)
    expect(result.InProgressVisits).toHaveLength(1)
  })

  it('makes POST request with verification token header', async () => {
    const req = new MyChartRequest('mychart.example.com')
    req.firstPathPart = 'MyChart'
    const calls: Array<{ url: string; init?: RequestInit }> = []
    let callIndex = 0

    const responses = [
      { body: '<input name="__RequestVerificationToken" value="my_csrf" />' },
      { body: JSON.stringify({}) },
    ]

    req.fetchWithCookieJar = mock(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: url.toString(), init })
      const r = responses[callIndex++]
      return new Response(r.body, { status: 200 })
    }) as typeof req.fetchWithCookieJar

    await upcomingVisits(req)

    // Second call should be the LoadUpcoming POST
    expect(calls[1].init?.method).toBe('POST')
    const headers = calls[1].init!.headers as Record<string, string>
    expect(headers['__requestverificationtoken']).toBe('my_csrf')
  })
})

describe('pastVisits', () => {
  it('returns error when no token found', async () => {
    const req = mockRequest([{ body: '<html></html>' }])
    const result = await pastVisits(req, new Date('2023-01-01'))
    expect(result).toEqual({ visits: [], error: 'Authentication error: could not get CSRF token for visits' })
  })

  it('returns past visits data', async () => {
    const visitsData = {
      List: {
        'Org-1': {
          List: [
            {
              Date: '12/01/2024',
              Time: '2:00 PM',
              VisitTypeName: 'Office Visit',
              PrimaryProviderName: 'Dr. Williams',
              PrimaryDepartment: { Name: 'Internal Medicine' },
              Diagnoses: 'Common Cold',
            },
            {
              Date: '11/15/2024',
              Time: '9:00 AM',
              VisitTypeName: 'Lab Work',
              PrimaryProviderName: 'Dr. Chen',
            },
          ],
        },
      },
    }

    const req = mockRequest([
      { body: '<input name="__RequestVerificationToken" value="tok" />' },
      { body: JSON.stringify(visitsData) },
    ])

    const result = await pastVisits(req, new Date('2023-01-01'))
    expect(result.List['Org-1'].List).toHaveLength(2)
    expect(result.List['Org-1'].List[0].VisitTypeName).toBe('Office Visit')
    expect(result.List['Org-1'].List[0].Diagnoses).toBe('Common Cold')
  })

  it('includes oldestRenderedDate in request URL', async () => {
    const req = new MyChartRequest('mychart.example.com')
    req.firstPathPart = 'MyChart'
    const calls: Array<{ url: string; init?: RequestInit }> = []
    let callIndex = 0

    const responses = [
      { body: '<input name="__RequestVerificationToken" value="tok" />' },
      { body: JSON.stringify({ List: {} }) },
    ]

    req.fetchWithCookieJar = mock(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: url.toString(), init })
      const r = responses[callIndex++]
      return new Response(r.body, { status: 200 })
    }) as typeof req.fetchWithCookieJar

    const oldestDate = new Date('2023-06-15T00:00:00.000Z')
    await pastVisits(req, oldestDate)

    // The LoadPast URL should contain the date
    expect(calls[1].url).toContain('oldestRenderedDate=')
    expect(calls[1].url).toContain('2023-06-15')
    expect(calls[1].init?.method).toBe('POST')
    expect(calls[1].init?.body).toBe('serializedIndex=')
  })

  it('returns visits from multiple organizations', async () => {
    const visitsData = {
      List: {
        'Org-A': {
          List: [{ Date: '12/01/2024', VisitTypeName: 'Check-up' }],
        },
        'Org-B': {
          List: [
            { Date: '11/01/2024', VisitTypeName: 'Specialist' },
            { Date: '10/01/2024', VisitTypeName: 'Follow-up' },
          ],
        },
      },
    }

    const req = mockRequest([
      { body: '<input name="__RequestVerificationToken" value="tok" />' },
      { body: JSON.stringify(visitsData) },
    ])

    const result = await pastVisits(req, new Date('2023-01-01'))
    expect(Object.keys(result.List)).toHaveLength(2)
    expect(result.List['Org-A'].List).toHaveLength(1)
    expect(result.List['Org-B'].List).toHaveLength(2)
  })
})
