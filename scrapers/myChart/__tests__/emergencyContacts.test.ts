import { describe, it, expect, mock } from 'bun:test'
import { getEmergencyContacts, addEmergencyContact, updateEmergencyContact, removeEmergencyContact } from '../emergencyContacts'
import { MyChartRequest } from '../myChartRequest'

function mockRequest(responses: Array<{ body: string; status?: number }>) {
  const req = new MyChartRequest('mychart.example.com')
  req.firstPathPart = 'MyChart'
  let i = 0
  req.fetchWithCookieJar = mock(async () => {
    const r = responses[i++]
    return new Response(r.body, { status: r.status ?? 200 })
  }) as typeof req.fetchWithCookieJar
  return req
}

const TOKEN_HTML = '<input name="__RequestVerificationToken" value="t" />'

describe('getEmergencyContacts', () => {
  it('returns empty array when no token found', async () => {
    const req = mockRequest([{ body: '<html></html>' }])
    expect(await getEmergencyContacts(req)).toEqual([])
  })

  it('parses contacts from API response', async () => {
    const req = mockRequest([
      { body: TOKEN_HTML },
      {
        body: JSON.stringify({
          relationships: [
            {
              name: 'Jane Doe',
              relationshipType: 'Spouse',
              phoneNumber: '555-1234',
              isEmergencyContact: true,
            },
          ],
        }),
      },
    ])

    const result = await getEmergencyContacts(req)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      name: 'Jane Doe',
      relationshipType: 'Spouse',
      phoneNumber: '555-1234',
      isEmergencyContact: true,
    })
  })

  it('handles missing fields with defaults', async () => {
    const req = mockRequest([
      { body: TOKEN_HTML },
      { body: JSON.stringify({ relationships: [{}] }) },
    ])

    const result = await getEmergencyContacts(req)
    expect(result[0]).toEqual({
      name: '',
      relationshipType: '',
      phoneNumber: '',
      isEmergencyContact: false,
    })
  })

  it('handles empty relationships list', async () => {
    const req = mockRequest([
      { body: TOKEN_HTML },
      { body: JSON.stringify({ relationships: [] }) },
    ])
    expect(await getEmergencyContacts(req)).toEqual([])
  })
})

describe('addEmergencyContact', () => {
  it('returns error when no token found', async () => {
    const req = mockRequest([{ body: '<html></html>' }])
    const result = await addEmergencyContact(req, { name: 'Test', relationshipType: 'Friend', phoneNumber: '555-0000' })
    expect(result).toEqual({ success: false, error: 'Could not get verification token' })
  })

  it('returns success on 200 response', async () => {
    const req = mockRequest([
      { body: TOKEN_HTML },
      { body: JSON.stringify({ success: true }), status: 200 },
    ])
    const result = await addEmergencyContact(req, { name: 'John', relationshipType: 'Friend', phoneNumber: '555-1111' })
    expect(result).toEqual({ success: true })
  })

  it('returns error on non-200 response', async () => {
    const req = mockRequest([
      { body: TOKEN_HTML },
      { body: 'Server error', status: 500 },
    ])
    const result = await addEmergencyContact(req, { name: 'John', relationshipType: 'Friend', phoneNumber: '555-1111' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('500')
  })

  it('sends correct payload', async () => {
    const req = mockRequest([
      { body: TOKEN_HTML },
      { body: '{}', status: 200 },
    ])
    await addEmergencyContact(req, { name: 'Lisa', relationshipType: 'Child', phoneNumber: '555-2222' })

    const fetchMock = req.fetchWithCookieJar as ReturnType<typeof mock>
    const secondCall = fetchMock.mock.calls[1]
    const body = JSON.parse(secondCall[1]?.body as string)
    expect(body).toEqual({
      name: 'Lisa',
      relationshipType: 'Child',
      phoneNumber: '555-2222',
      isEmergencyContact: true,
    })
  })
})

describe('updateEmergencyContact', () => {
  it('returns error when no token found', async () => {
    const req = mockRequest([{ body: '<html></html>' }])
    const result = await updateEmergencyContact(req, { id: 'EC-1', name: 'Updated' })
    expect(result).toEqual({ success: false, error: 'Could not get verification token' })
  })

  it('returns success on 200 response', async () => {
    const req = mockRequest([
      { body: TOKEN_HTML },
      { body: '{}', status: 200 },
    ])
    const result = await updateEmergencyContact(req, { id: 'EC-1', phoneNumber: '555-9999' })
    expect(result).toEqual({ success: true })
  })

  it('sends only provided fields', async () => {
    const req = mockRequest([
      { body: TOKEN_HTML },
      { body: '{}', status: 200 },
    ])
    await updateEmergencyContact(req, { id: 'EC-1', phoneNumber: '555-9999' })

    const fetchMock = req.fetchWithCookieJar as ReturnType<typeof mock>
    const secondCall = fetchMock.mock.calls[1]
    const body = JSON.parse(secondCall[1]?.body as string)
    expect(body).toEqual({
      id: 'EC-1',
      phoneNumber: '555-9999',
      isEmergencyContact: true,
    })
    expect(body.name).toBeUndefined()
    expect(body.relationshipType).toBeUndefined()
  })
})

describe('removeEmergencyContact', () => {
  it('returns error when no token found', async () => {
    const req = mockRequest([{ body: '<html></html>' }])
    const result = await removeEmergencyContact(req, 'EC-1')
    expect(result).toEqual({ success: false, error: 'Could not get verification token' })
  })

  it('returns success on 200 response', async () => {
    const req = mockRequest([
      { body: TOKEN_HTML },
      { body: '{}', status: 200 },
    ])
    const result = await removeEmergencyContact(req, 'EC-1')
    expect(result).toEqual({ success: true })
  })

  it('sends correct payload', async () => {
    const req = mockRequest([
      { body: TOKEN_HTML },
      { body: '{}', status: 200 },
    ])
    await removeEmergencyContact(req, 'EC-42')

    const fetchMock = req.fetchWithCookieJar as ReturnType<typeof mock>
    const secondCall = fetchMock.mock.calls[1]
    const body = JSON.parse(secondCall[1]?.body as string)
    expect(body).toEqual({ id: 'EC-42' })
  })

  it('returns error on non-200 response', async () => {
    const req = mockRequest([
      { body: TOKEN_HTML },
      { body: 'Not found', status: 404 },
    ])
    const result = await removeEmergencyContact(req, 'EC-999')
    expect(result.success).toBe(false)
    expect(result.error).toContain('404')
  })
})
