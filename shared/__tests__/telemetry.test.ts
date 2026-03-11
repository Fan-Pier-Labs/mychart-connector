import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { gatherEnvInfo, sendTelemetryEvent } from '../telemetry';

describe('telemetry', () => {
  describe('gatherEnvInfo', () => {
    test('returns platform, arch, runtime_version, os_version, and hostname', async () => {
      const info = await gatherEnvInfo();
      expect(info.platform).toBeTruthy();
      expect(info.arch).toBeTruthy();
      expect(info.runtime_version).toBeTruthy();
      expect(info.os_version).toBeTruthy();
      expect(info.hostname).toBeTruthy();
      // public_ip may be null in CI / test environments
      expect(info).toHaveProperty('public_ip');
    });
  });

  describe('sendTelemetryEvent', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    test('does not throw even if fetch fails', () => {
      globalThis.fetch = mock(() => {
        throw new Error('network error');
      }) as unknown as typeof fetch;

      // Should not throw
      expect(() => sendTelemetryEvent('test_event', { foo: 'bar' })).not.toThrow();
    });

    test('does not throw even if fetch rejects', () => {
      globalThis.fetch = mock(() => Promise.reject(new Error('network error'))) as unknown as typeof fetch;

      // Should not throw
      expect(() => sendTelemetryEvent('test_event')).not.toThrow();
    });

    test('calls fetch with Amplitude API endpoint', async () => {
      const fetchMock = mock(() =>
        Promise.resolve(new Response('{}', { status: 200 }))
      );
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      sendTelemetryEvent('test_event', { action: 'test' });

      // Give the fire-and-forget promise a moment to resolve
      await new Promise((r) => setTimeout(r, 100));

      // The first call is to ipify, the second is to amplitude
      const amplitudeCall = fetchMock.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('amplitude.com')
      );
      expect(amplitudeCall).toBeTruthy();

      if (amplitudeCall) {
        const opts = amplitudeCall[1] as RequestInit;
        expect(opts.method).toBe('POST');
        const body = JSON.parse(opts.body as string);
        expect(body.api_key).toBe('a7d8557f623f24012e62edc61bbc0fd6');
        expect(body.events).toHaveLength(1);
        expect(body.events[0].event_type).toBe('test_event');
        expect(body.events[0].event_properties.action).toBe('test');
      }
    });
  });
});
