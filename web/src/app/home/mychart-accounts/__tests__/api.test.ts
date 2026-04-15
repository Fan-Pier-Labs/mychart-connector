import { describe, it, expect, mock, beforeEach } from 'bun:test';
import {
  addInstanceApi,
  connectInstanceApi,
  submit2faApi,
  deleteInstanceApi,
  toggleInstanceApi,
} from '../api';

const mockFetch = mock(() => Promise.resolve(new Response()));

beforeEach(() => {
  mockFetch.mockClear();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

describe('mychart-accounts API', () => {
  describe('addInstanceApi', () => {
    it('returns ok on successful add', async () => {
      mockFetch.mockResolvedValueOnce(new Response(
        JSON.stringify({ id: 'inst-1' }),
        { status: 201 },
      ));

      const result = await addInstanceApi('mychart.example.org', 'user', 'pass');
      expect(result).toEqual({ ok: true });

      expect(mockFetch).toHaveBeenCalledWith('/api/mychart-instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname: 'mychart.example.org', username: 'user', password: 'pass' }),
      });
    });

    it('returns error on failure', async () => {
      mockFetch.mockResolvedValueOnce(new Response(
        JSON.stringify({ error: 'Duplicate hostname' }),
        { status: 400 },
      ));

      const result = await addInstanceApi('mychart.example.org', 'user', 'pass');
      expect(result).toEqual({ ok: false, error: 'Duplicate hostname' });
    });

    it('returns default error when no error field', async () => {
      mockFetch.mockResolvedValueOnce(new Response(
        JSON.stringify({}),
        { status: 500 },
      ));

      const result = await addInstanceApi('host', 'user', 'pass');
      expect(result).toEqual({ ok: false, error: 'Failed to add instance.' });
    });
  });

  describe('connectInstanceApi', () => {
    it('returns logged_in state', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        state: 'logged_in',
        sessionKey: 'user-1:inst-1',
      })));

      const result = await connectInstanceApi('inst-1');
      expect(result).toEqual({ state: 'logged_in', sessionKey: 'user-1:inst-1' });
    });

    it('returns need_2fa state with delivery info', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        state: 'need_2fa',
        sessionKey: 'session-key',
        twoFaDelivery: { method: 'sms', contact: '***1234' },
      })));

      const result = await connectInstanceApi('inst-1');
      expect(result.state).toBe('need_2fa');
      expect((result as { twoFaDelivery: { method: string } }).twoFaDelivery.method).toBe('sms');
    });

    it('returns invalid_login state', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        state: 'invalid_login',
      })));

      const result = await connectInstanceApi('inst-1');
      expect(result.state).toBe('invalid_login');
    });

    it('calls POST on the correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ state: 'logged_in', sessionKey: 'k' })));

      await connectInstanceApi('my-inst-id');
      expect(mockFetch).toHaveBeenCalledWith('/api/mychart-instances/my-inst-id/connect', {
        method: 'POST',
      });
    });
  });

  describe('submit2faApi', () => {
    it('returns logged_in on success', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        state: 'logged_in',
        sessionKey: 'user-1:inst-1',
        instanceId: 'inst-1',
        offerPasskeySetup: true,
      })));

      const result = await submit2faApi('session-key', '123456');
      expect(result.state).toBe('logged_in');
      expect((result as { offerPasskeySetup: boolean }).offerPasskeySetup).toBe(true);
    });

    it('returns invalid_2fa on wrong code', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        state: 'invalid_2fa',
      })));

      const result = await submit2faApi('session-key', '000000');
      expect(result.state).toBe('invalid_2fa');
    });

    it('sends correct request body', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ state: 'logged_in', sessionKey: 'k' })));

      await submit2faApi('my-session', '654321');
      expect(mockFetch).toHaveBeenCalledWith('/api/twofa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionKey: 'my-session', code: '654321' }),
      });
    });
  });

  describe('deleteInstanceApi', () => {
    it('calls DELETE on the correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({})));

      await deleteInstanceApi('inst-42');
      expect(mockFetch).toHaveBeenCalledWith('/api/mychart-instances/inst-42', {
        method: 'DELETE',
      });
    });
  });

  describe('toggleInstanceApi', () => {
    it('returns ok on success', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

      const result = await toggleInstanceApi('inst-1', true);
      expect(result).toEqual({ ok: true });
    });

    it('returns error on failure', async () => {
      mockFetch.mockResolvedValueOnce(new Response(
        JSON.stringify({ error: 'Instance not found' }),
        { status: 404 },
      ));

      const result = await toggleInstanceApi('inst-1', false);
      expect(result).toEqual({ ok: false, error: 'Instance not found' });
    });

    it('sends correct request body', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

      await toggleInstanceApi('inst-1', false);
      expect(mockFetch).toHaveBeenCalledWith('/api/mychart-instances/inst-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      });
    });
  });
});
