import { describe, test, expect } from 'bun:test';
import { parseHostname } from '../setup';

describe('parseHostname', () => {
  test('extracts hostname from full https URL with path', () => {
    expect(parseHostname('https://mychart.denverhealth.org/MyChart/Authentication/Login')).toBe('mychart.denverhealth.org');
  });

  test('extracts hostname from full http URL', () => {
    expect(parseHostname('http://mychart.example.org/MyChart/')).toBe('mychart.example.org');
  });

  test('extracts hostname from URL with no path', () => {
    expect(parseHostname('https://mychart.example.org')).toBe('mychart.example.org');
  });

  test('returns bare hostname as-is', () => {
    expect(parseHostname('mychart.example.org')).toBe('mychart.example.org');
  });

  test('handles hostname with subdomain', () => {
    expect(parseHostname('fake-mychart.fanpierlabs.com')).toBe('fake-mychart.fanpierlabs.com');
  });

  test('strips port from URL', () => {
    expect(parseHostname('https://mychart.example.org:8443/MyChart')).toBe('mychart.example.org');
  });

  test('handles URL with query params', () => {
    expect(parseHostname('https://mychart.example.org/MyChart?foo=bar')).toBe('mychart.example.org');
  });

  test('handles URL with trailing slash', () => {
    expect(parseHostname('https://mychart.example.org/')).toBe('mychart.example.org');
  });
});
