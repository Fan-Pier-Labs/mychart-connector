import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { fetchNotifPrefs, updateNotifPrefs } from '../api';

const mockFetch = mock(() => Promise.resolve(new Response()));

beforeEach(() => {
  mockFetch.mockClear();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

describe('notifications API', () => {
  describe('fetchNotifPrefs', () => {
    it('returns prefs when API returns valid data', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        enabled: true,
        includeContent: false,
      })));

      const result = await fetchNotifPrefs();
      expect(result).toEqual({ enabled: true, includeContent: false });
    });

    it('returns null when API returns non-boolean fields', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        enabled: 'yes',
        includeContent: 1,
      })));

      const result = await fetchNotifPrefs();
      expect(result).toBeNull();
    });

    it('returns null when API returns empty object', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({})));

      const result = await fetchNotifPrefs();
      expect(result).toBeNull();
    });
  });

  describe('updateNotifPrefs', () => {
    it('returns ok with prefs on success', async () => {
      mockFetch.mockResolvedValueOnce(new Response(
        JSON.stringify({ enabled: true, includeContent: true }),
        { status: 200 },
      ));

      const result = await updateNotifPrefs(true, true);
      expect(result).toEqual({
        ok: true,
        prefs: { enabled: true, includeContent: true },
      });

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/notifications/preferences');
      expect(init.method).toBe('PUT');
      expect(init.body).toBe(JSON.stringify({ enabled: true, includeContent: true }));
      expect(new Headers(init.headers).get('content-type')).toBe('application/json');
    });

    it('returns error on failure', async () => {
      mockFetch.mockResolvedValueOnce(new Response(
        JSON.stringify({ error: 'Not authorized' }),
        { status: 401 },
      ));

      const result = await updateNotifPrefs(true, false);
      expect(result).toEqual({ ok: false, error: 'Not authorized' });
    });

    it('returns default error message when no error field', async () => {
      mockFetch.mockResolvedValueOnce(new Response(
        JSON.stringify({}),
        { status: 500 },
      ));

      const result = await updateNotifPrefs(false, false);
      expect(result).toEqual({ ok: false, error: 'Failed to update preferences.' });
    });
  });
});
