import { describe, it, expect, mock } from 'bun:test'
import { getLetters } from '../letters'
import { MyChartRequest } from '../myChartRequest'

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

describe('getLetters', () => {
  it('returns empty array when no token found', async () => {
    const req = mockRequest([{ body: '<html></html>' }])
    expect(await getLetters(req)).toEqual([])
  })

  it('parses letters with provider info, sorted newest-first', async () => {
    const req = mockRequest([
      { body: '<input name="__RequestVerificationToken" value="t" />' },
      {
        body: JSON.stringify({
          users: {
            'E100': { name: 'Dr. Alice Smith', photoUrl: '/photos/alice.jpg' },
            'E200': { name: 'Dr. Bob Jones', photoUrl: '/photos/bob.jpg' },
          },
          letters: [
            // Intentionally not sorted in the source response
            { dateISO: '2024-01-15', reason: 'Annual Physical', viewed: true, empId: 'E100', hnoId: 'H1', csn: 'C1' },
            { dateISO: '2024-03-20', reason: 'Follow-up', viewed: false, empId: 'E200', hnoId: 'H2', csn: 'C2' },
          ],
        }),
      },
    ])

    const result = await getLetters(req)
    expect(result).toHaveLength(2)
    // Newest first
    expect(result[0]).toEqual({
      dateISO: '2024-03-20',
      reason: 'Follow-up',
      viewed: false,
      providerName: 'Dr. Bob Jones',
      providerPhotoUrl: '/photos/bob.jpg',
      hnoId: 'H2',
      csn: 'C2',
    })
    expect(result[1].providerName).toBe('Dr. Alice Smith')
  })

  it('places letters with missing dateISO last', async () => {
    const req = mockRequest([
      { body: '<input name="__RequestVerificationToken" value="t" />' },
      {
        body: JSON.stringify({
          users: {},
          letters: [
            { dateISO: '', reason: 'Undated', viewed: false, empId: '', hnoId: 'H1', csn: 'C1' },
            { dateISO: '2024-03-20', reason: 'Dated', viewed: false, empId: '', hnoId: 'H2', csn: 'C2' },
          ],
        }),
      },
    ])

    const result = await getLetters(req)
    expect(result.map(l => l.reason)).toEqual(['Dated', 'Undated'])
  })

  it('handles letter with unknown empId', async () => {
    const req = mockRequest([
      { body: '<input name="__RequestVerificationToken" value="t" />' },
      {
        body: JSON.stringify({
          users: {},
          letters: [{ dateISO: '2024-01-01', reason: 'Test', viewed: false, empId: 'UNKNOWN', hnoId: 'H1', csn: 'C1' }],
        }),
      },
    ])

    const result = await getLetters(req)
    expect(result[0].providerName).toBe('')
    expect(result[0].providerPhotoUrl).toBe('')
  })

  it('handles empty letters array', async () => {
    const req = mockRequest([
      { body: '<input name="__RequestVerificationToken" value="t" />' },
      { body: JSON.stringify({ users: {}, letters: [] }) },
    ])
    expect(await getLetters(req)).toEqual([])
  })
})
