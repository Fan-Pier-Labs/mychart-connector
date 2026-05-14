import { describe, it, expect } from 'bun:test'
import { pickInstance, pickByInstanceIdentifier } from '../server'

type Conn = { instance: { hostname: string; username: string } }

const conn = (hostname: string, username: string): Conn => ({
  instance: { hostname, username },
})

describe('pickInstance', () => {
  describe('no instance specified', () => {
    it('picks the only connected account', () => {
      const r = pickInstance([conn('host-a', 'alice')], undefined)
      expect(r).toEqual({ matchIndex: 0 })
    })

    it('errors when multiple accounts are connected with no instance hint', () => {
      const r = pickInstance(
        [conn('host-a', 'alice'), conn('host-b', 'bob')],
        undefined
      )
      expect(r).toEqual({ error: expect.stringContaining('Multiple MyChart accounts') })
    })

    it('lists hostname:username pairs in the multi-account error', () => {
      const r = pickInstance(
        [conn('host-a', 'alice'), conn('host-b', 'bob')],
        undefined
      ) as { error: string }
      expect(r.error).toContain('host-a:alice')
      expect(r.error).toContain('host-b:bob')
    })
  })

  describe('exact hostname match', () => {
    it('matches a unique hostname', () => {
      const r = pickInstance(
        [conn('host-a', 'alice'), conn('host-b', 'bob')],
        'host-a'
      )
      expect(r).toEqual({ matchIndex: 0 })
    })

    it('returns ambiguity error when multiple accounts share a hostname', () => {
      const r = pickInstance(
        [conn('host-shared', 'alice'), conn('host-shared', 'bob')],
        'host-shared'
      ) as { error: string }
      expect(r.error).toContain('Multiple accounts')
      expect(r.error).toContain('host-shared:alice')
      expect(r.error).toContain('host-shared:bob')
    })

    it('preserves port-suffixed hostnames as a single token', () => {
      // The web app stores hostnames as "host:port" when a custom port is set;
      // we must match those exactly without trying to parse the colon as username.
      const r = pickInstance(
        [conn('mychart.example.org:8443', 'alice')],
        'mychart.example.org:8443'
      )
      expect(r).toEqual({ matchIndex: 0 })
    })
  })

  describe('hostname:username disambiguation', () => {
    it('selects the right account from a shared hostname', () => {
      const r = pickInstance(
        [conn('host-shared', 'alice'), conn('host-shared', 'bob')],
        'host-shared:bob'
      )
      expect(r).toEqual({ matchIndex: 1 })
    })

    it('works for port-suffixed hostname plus username (lastIndexOf split)', () => {
      const r = pickInstance(
        [
          conn('mychart.example.org:8443', 'alice'),
          conn('mychart.example.org:8443', 'bob'),
        ],
        'mychart.example.org:8443:bob'
      )
      expect(r).toEqual({ matchIndex: 1 })
    })

    it('returns not-found when username does not match any account on that host', () => {
      const r = pickInstance(
        [conn('host-shared', 'alice'), conn('host-shared', 'bob')],
        'host-shared:carol'
      ) as { error: string }
      expect(r.error).toContain('not found')
    })
  })

  describe('malformed instance strings', () => {
    it('rejects ":alice" (leading colon) as not-found', () => {
      const r = pickInstance(
        [conn('host-a', 'alice')],
        ':alice'
      ) as { error: string }
      expect(r.error).toContain('not found')
    })

    it('rejects "host:" (trailing colon) as not-found', () => {
      const r = pickInstance(
        [conn('host-a', 'alice')],
        'host-a:'
      ) as { error: string }
      expect(r.error).toContain('not found')
    })
  })

  describe('not-found error format', () => {
    it('lists all connected accounts in the error', () => {
      const r = pickInstance(
        [conn('host-a', 'alice'), conn('host-b', 'bob')],
        'host-nonexistent'
      ) as { error: string }
      expect(r.error).toContain('host-a:alice')
      expect(r.error).toContain('host-b:bob')
    })
  })

  describe('configured context (not just connected sessions)', () => {
    // Sanity-check the variant used by connect_instance / check_session / complete_2fa.
    type Inst = { hostname: string; username: string }
    const accessor = (i: Inst) => ({ hostname: i.hostname, username: i.username })

    it('error message says "configured" not "connected"', () => {
      const r = pickByInstanceIdentifier(
        [{ hostname: 'host-a', username: 'alice' }] as Inst[],
        'host-missing',
        accessor,
        'configured'
      ) as { error: string }
      expect(r.error).toContain('not configured')
      expect(r.error).toContain('Available:')
    })

    it('multi-account error works with configured context', () => {
      const r = pickByInstanceIdentifier(
        [
          { hostname: 'host-a', username: 'alice' },
          { hostname: 'host-a', username: 'bob' },
        ] as Inst[],
        'host-a',
        accessor,
        'configured'
      ) as { error: string }
      expect(r.error).toContain('Multiple accounts')
      expect(r.error).toContain('host-a:alice')
      expect(r.error).toContain('host-a:bob')
    })

    it('hostname:username syntax works with configured context', () => {
      const r = pickByInstanceIdentifier(
        [
          { hostname: 'host-a', username: 'alice' },
          { hostname: 'host-a', username: 'bob' },
        ] as Inst[],
        'host-a:bob',
        accessor,
        'configured'
      )
      expect(r).toEqual({ matchIndex: 1 })
    })
  })
})
