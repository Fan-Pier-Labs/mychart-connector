import { describe, it, expect } from 'bun:test'
import * as cheerio from 'cheerio'

// Port the parseConvo logic for testing.
// These types mirror the web/src/lib/mychart/types.ts.
type MyChartMessage = {
  wmgId: string
  deliveryInstantISO: string
  body: string
  author: { wprKey?: string; empKey?: string }
}

type InputUser = { name: string; photoUrl: string; providerId: string; empId: string }
type InputViewer = { wprId: string; name: string }

type InputFormat = {
  users: Record<string, InputUser>
  viewers: Record<string, InputViewer>
  subject: string
  messages: MyChartMessage[]
  hthId: string
}

type Message = { messageId: string; userId: string; timestamp: string; message: string }
type User = {
  isProvider: boolean
  name: string
  photoUrl: string
  allIds: Record<string, string | undefined>
  id: string
}
type Conversation = { users: User[]; messages: Message[]; subject: string; id: string }

// Reimplementation matching src/main/scrapers/myChart/messages/parseConvo.ts
function parseConvo(json: InputFormat): Conversation {
  const plainTextMessages: Message[] = []
  for (const message of json.messages) {
    const $ = cheerio.load(message.body)
    const text = $.text().trim()
    plainTextMessages.push({
      message: text,
      messageId: message.wmgId,
      timestamp: message.deliveryInstantISO,
      userId: (message.author.wprKey ?? message.author.empKey)!,
    })
  }

  const users: User[] = []
  for (const user of Object.values(json.users)) {
    users.push({
      isProvider: true,
      name: user.name,
      photoUrl: user.photoUrl,
      allIds: { employeeId: user.empId, providerId: user.providerId },
      id: user.empId,
    })
  }
  for (const viewer of Object.values(json.viewers)) {
    users.push({
      isProvider: false,
      name: viewer.name,
      photoUrl: '',
      allIds: { wprKey: viewer.wprId },
      id: viewer.wprId,
    })
  }

  return {
    users,
    subject: json.subject,
    messages: plainTextMessages,
    id: json.hthId,
  }
}

describe('parseConvo', () => {
  it('strips HTML from message bodies', () => {
    const input: InputFormat = {
      users: {},
      viewers: { v1: { wprId: 'WPR1', name: 'Patient' } },
      subject: 'Test',
      hthId: 'convo1',
      messages: [
        {
          wmgId: 'msg1',
          deliveryInstantISO: '2024-01-15T10:00:00Z',
          body: '<p>Hello <strong>doctor</strong>, I have a <em>question</em>.</p>',
          author: { wprKey: 'WPR1' },
        },
      ],
    }
    const result = parseConvo(input)
    expect(result.messages[0].message).toBe('Hello doctor, I have a question.')
  })

  it('handles plain text bodies (no HTML)', () => {
    const input: InputFormat = {
      users: {},
      viewers: { v1: { wprId: 'WPR1', name: 'Patient' } },
      subject: 'Plain',
      hthId: 'convo2',
      messages: [
        {
          wmgId: 'msg2',
          deliveryInstantISO: '2024-01-15T11:00:00Z',
          body: 'Just plain text message',
          author: { wprKey: 'WPR1' },
        },
      ],
    }
    const result = parseConvo(input)
    expect(result.messages[0].message).toBe('Just plain text message')
  })

  it('handles complex HTML with links, lists, and divs', () => {
    const input: InputFormat = {
      users: {},
      viewers: { v1: { wprId: 'WPR1', name: 'P' } },
      subject: 'Complex',
      hthId: 'convo3',
      messages: [
        {
          wmgId: 'msg3',
          deliveryInstantISO: '2024-01-15T12:00:00Z',
          body: `
            <div>
              <p>Dear Patient,</p>
              <ul>
                <li>Take medication A</li>
                <li>Take medication B</li>
              </ul>
              <p>Visit <a href="https://example.com">this link</a> for details.</p>
            </div>
          `,
          author: { empKey: 'EMP1' },
        },
      ],
    }
    const result = parseConvo(input)
    expect(result.messages[0].message).toContain('Dear Patient')
    expect(result.messages[0].message).toContain('Take medication A')
    expect(result.messages[0].message).toContain('Take medication B')
    expect(result.messages[0].message).toContain('this link')
    expect(result.messages[0].message).not.toContain('<')
  })

  it('trims whitespace from extracted text', () => {
    const input: InputFormat = {
      users: {},
      viewers: { v1: { wprId: 'WPR1', name: 'P' } },
      subject: 'Whitespace',
      hthId: 'convo4',
      messages: [
        {
          wmgId: 'msg4',
          deliveryInstantISO: '2024-01-15T13:00:00Z',
          body: '   \n  <p>  Trimmed message  </p>  \n   ',
          author: { wprKey: 'WPR1' },
        },
      ],
    }
    const result = parseConvo(input)
    expect(result.messages[0].message).toBe('Trimmed message')
  })

  it('maps provider users correctly', () => {
    const input: InputFormat = {
      users: {
        u1: { name: 'Dr. Smith', photoUrl: 'https://photo.url/smith.jpg', providerId: 'PROV1', empId: 'EMP1' },
        u2: { name: 'Nurse Jones', photoUrl: '', providerId: 'PROV2', empId: 'EMP2' },
      },
      viewers: {},
      subject: 'Test',
      hthId: 'convo5',
      messages: [],
    }
    const result = parseConvo(input)
    expect(result.users).toHaveLength(2)

    const drSmith = result.users.find(u => u.name === 'Dr. Smith')!
    expect(drSmith.isProvider).toBe(true)
    expect(drSmith.id).toBe('EMP1')
    expect(drSmith.photoUrl).toBe('https://photo.url/smith.jpg')
    expect(drSmith.allIds.employeeId).toBe('EMP1')
    expect(drSmith.allIds.providerId).toBe('PROV1')

    const nurse = result.users.find(u => u.name === 'Nurse Jones')!
    expect(nurse.isProvider).toBe(true)
    expect(nurse.id).toBe('EMP2')
  })

  it('maps viewer (patient) users correctly', () => {
    const input: InputFormat = {
      users: {},
      viewers: {
        v1: { wprId: 'WPR1', name: 'Alice Patient' },
        v2: { wprId: 'WPR2', name: 'Bob Patient' },
      },
      subject: 'Test',
      hthId: 'convo6',
      messages: [],
    }
    const result = parseConvo(input)
    expect(result.users).toHaveLength(2)

    const alice = result.users.find(u => u.name === 'Alice Patient')!
    expect(alice.isProvider).toBe(false)
    expect(alice.id).toBe('WPR1')
    expect(alice.photoUrl).toBe('')
    expect(alice.allIds.wprKey).toBe('WPR1')
  })

  it('uses wprKey for patient message userId', () => {
    const input: InputFormat = {
      users: {},
      viewers: { v1: { wprId: 'WPR1', name: 'Patient' } },
      subject: 'Test',
      hthId: 'convo7',
      messages: [
        {
          wmgId: 'msg1',
          deliveryInstantISO: '2024-01-01T00:00:00Z',
          body: 'Hello',
          author: { wprKey: 'WPR1' },
        },
      ],
    }
    const result = parseConvo(input)
    expect(result.messages[0].userId).toBe('WPR1')
  })

  it('uses empKey for provider message userId when wprKey is absent', () => {
    const input: InputFormat = {
      users: { u1: { name: 'Dr. X', photoUrl: '', providerId: 'P1', empId: 'EMP1' } },
      viewers: {},
      subject: 'Test',
      hthId: 'convo8',
      messages: [
        {
          wmgId: 'msg1',
          deliveryInstantISO: '2024-01-01T00:00:00Z',
          body: 'Response from doctor',
          author: { empKey: 'EMP1' },
        },
      ],
    }
    const result = parseConvo(input)
    expect(result.messages[0].userId).toBe('EMP1')
  })

  it('prefers wprKey over empKey when both present', () => {
    const input: InputFormat = {
      users: {},
      viewers: {},
      subject: 'Test',
      hthId: 'convo9',
      messages: [
        {
          wmgId: 'msg1',
          deliveryInstantISO: '2024-01-01T00:00:00Z',
          body: 'test',
          author: { wprKey: 'WPR_PREF', empKey: 'EMP_FALL' },
        },
      ],
    }
    const result = parseConvo(input)
    expect(result.messages[0].userId).toBe('WPR_PREF')
  })

  it('preserves conversation metadata', () => {
    const input: InputFormat = {
      users: {},
      viewers: {},
      subject: 'Lab Results Discussion',
      hthId: 'HTH_12345',
      messages: [],
    }
    const result = parseConvo(input)
    expect(result.subject).toBe('Lab Results Discussion')
    expect(result.id).toBe('HTH_12345')
  })

  it('handles multiple messages in order', () => {
    const input: InputFormat = {
      users: { u1: { name: 'Dr.', photoUrl: '', providerId: 'P', empId: 'E1' } },
      viewers: { v1: { wprId: 'W1', name: 'Patient' } },
      subject: 'Thread',
      hthId: 'convo10',
      messages: [
        { wmgId: 'm1', deliveryInstantISO: '2024-01-01T08:00:00Z', body: '<p>First message</p>', author: { wprKey: 'W1' } },
        { wmgId: 'm2', deliveryInstantISO: '2024-01-01T09:00:00Z', body: '<p>Second message</p>', author: { empKey: 'E1' } },
        { wmgId: 'm3', deliveryInstantISO: '2024-01-01T10:00:00Z', body: '<p>Third message</p>', author: { wprKey: 'W1' } },
      ],
    }
    const result = parseConvo(input)
    expect(result.messages).toHaveLength(3)
    expect(result.messages[0].message).toBe('First message')
    expect(result.messages[1].message).toBe('Second message')
    expect(result.messages[2].message).toBe('Third message')
    expect(result.messages[0].timestamp).toBe('2024-01-01T08:00:00Z')
  })

  it('handles empty messages array', () => {
    const input: InputFormat = {
      users: {},
      viewers: {},
      subject: 'Empty',
      hthId: 'convo11',
      messages: [],
    }
    const result = parseConvo(input)
    expect(result.messages).toEqual([])
  })

  it('handles message with empty body', () => {
    const input: InputFormat = {
      users: {},
      viewers: { v1: { wprId: 'W', name: 'P' } },
      subject: 'Empty body',
      hthId: 'convo12',
      messages: [
        { wmgId: 'm1', deliveryInstantISO: '2024-01-01T00:00:00Z', body: '', author: { wprKey: 'W' } },
      ],
    }
    const result = parseConvo(input)
    expect(result.messages[0].message).toBe('')
  })

  it('handles HTML entities in message body', () => {
    const input: InputFormat = {
      users: {},
      viewers: { v1: { wprId: 'W', name: 'P' } },
      subject: 'Entities',
      hthId: 'convo13',
      messages: [
        { wmgId: 'm1', deliveryInstantISO: '2024-01-01T00:00:00Z', body: '<p>Temperature &gt; 100&deg;F &amp; rising</p>', author: { wprKey: 'W' } },
      ],
    }
    const result = parseConvo(input)
    expect(result.messages[0].message).toContain('Temperature > 100')
    expect(result.messages[0].message).toContain('& rising')
  })

  it('handles <br> tags as whitespace', () => {
    const input: InputFormat = {
      users: {},
      viewers: { v1: { wprId: 'W', name: 'P' } },
      subject: 'Breaks',
      hthId: 'convo14',
      messages: [
        { wmgId: 'm1', deliveryInstantISO: '2024-01-01T00:00:00Z', body: 'Line one<br>Line two<br/>Line three', author: { wprKey: 'W' } },
      ],
    }
    const result = parseConvo(input)
    // cheerio $.text() joins text nodes, br becomes empty
    expect(result.messages[0].message).toContain('Line one')
    expect(result.messages[0].message).toContain('Line two')
    expect(result.messages[0].message).toContain('Line three')
  })
})
