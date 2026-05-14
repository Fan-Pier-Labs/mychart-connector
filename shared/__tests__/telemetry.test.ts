import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { gatherEnvInfo, sendTelemetryEvent } from '../telemetry';

describe('telemetry', () => {
  describe('gatherEnvInfo', () => {
    test('returns platform, arch, runtime_version, os_version', () => {
      const info = gatherEnvInfo();
      expect(info.platform).toBeTruthy();
      expect(info.arch).toBeTruthy();
      expect(info.runtime_version).toBeTruthy();
      expect(info.os_version).toBeTruthy();
    });

    test('does not include identifying fields', () => {
      const info = gatherEnvInfo();
      // The anonymized version drops public_ip, hostname, git identity,
      // env_user. None of those should be in the payload.
      expect(info).not.toHaveProperty('public_ip');
      expect(info).not.toHaveProperty('hostname');
      expect(info).not.toHaveProperty('git_user_name');
      expect(info).not.toHaveProperty('git_user_email');
      expect(info).not.toHaveProperty('env_user');
    });
  });

  describe('sendTelemetryEvent', () => {
    let originalFetch: typeof globalThis.fetch;
    let originalDisable: string | undefined;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
      originalDisable = process.env.MYCHART_CLI_TELEMETRY_DISABLED;
      delete process.env.MYCHART_CLI_TELEMETRY_DISABLED;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      if (originalDisable === undefined) {
        delete process.env.MYCHART_CLI_TELEMETRY_DISABLED;
      } else {
        process.env.MYCHART_CLI_TELEMETRY_DISABLED = originalDisable;
      }
    });

    test('does not throw even if fetch fails', () => {
      globalThis.fetch = mock(() => {
        throw new Error('network error');
      }) as unknown as typeof fetch;
      expect(() => sendTelemetryEvent('test_event', { foo: 'bar' })).not.toThrow();
    });

    test('does not throw even if fetch rejects', () => {
      globalThis.fetch = mock(() => Promise.reject(new Error('network error'))) as unknown as typeof fetch;
      expect(() => sendTelemetryEvent('test_event')).not.toThrow();
    });

    test('calls fetch with Amplitude API endpoint and anonymous payload', async () => {
      const fetchMock = mock(() =>
        Promise.resolve(new Response('{}', { status: 200 }))
      );
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      sendTelemetryEvent('test_event', { action: 'test' });
      await new Promise((r) => setTimeout(r, 100));

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

        // Identifying fields must not appear anywhere in the payload.
        const ev = body.events[0];
        expect(ev.user_properties).toBeUndefined();
        expect(ev.event_properties.public_ip).toBeUndefined();
        expect(JSON.stringify(body)).not.toContain('git_user_email');
        expect(JSON.stringify(body)).not.toContain('git_user_name');
      }
    });

    test('does not fetch when MYCHART_CLI_TELEMETRY_DISABLED is set', async () => {
      process.env.MYCHART_CLI_TELEMETRY_DISABLED = '1';
      const fetchMock = mock(() =>
        Promise.resolve(new Response('{}', { status: 200 }))
      );
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      sendTelemetryEvent('test_event');
      await new Promise((r) => setTimeout(r, 100));

      expect(fetchMock.mock.calls).toHaveLength(0);
    });
  });
});
