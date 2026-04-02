import { describe, it, expect, mock, beforeEach } from 'bun:test';
import type { MyChartInstance } from '@/lib/db';

// Mock sessionStore
const mockGetEntry = mock(() => undefined as unknown);
const mockDelete = mock(() => {});
mock.module('../../../../../scrapers/myChart/sessionStore', () => ({
  sessionStore: {
    getEntry: mockGetEntry,
    delete: mockDelete,
    set: mock(() => {}),
  },
}));

// Mock sessions module
const mockSetSession = mock(() => {});
mock.module('../../sessions', () => ({
  setSession: mockSetSession,
}));

// Import real implementations to re-export alongside mocks, so other test
// files that import from the same module are not broken by partial mocks.
const realLogin = await import('../../mychart/login');

// Mock login module
const mockLogin = mock(() => Promise.resolve({ state: 'logged_in' as const, mychartRequest: {} }));
const mockComplete2fa = mock(() => Promise.resolve({ state: 'logged_in' as const, mychartRequest: {} }));
mock.module('../../mychart/login', () => ({
  ...realLogin,
  myChartUserPassLogin: mockLogin,
  complete2faFlow: mockComplete2fa,
}));

// Mock TOTP
mock.module('../../mychart/totp', () => ({
  generateTotpCode: () => Promise.resolve('123456'),
}));

const { autoConnectInstance } = await import('../auto-connect');

function makeInstance(overrides: Partial<MyChartInstance> = {}): MyChartInstance {
  return {
    id: 'inst-1',
    userId: 'user-1',
    hostname: 'mychart.example.com',
    username: 'testuser',
    password: 'testpass',
    totpSecret: null,
    mychartEmail: null,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('autoConnectInstance', () => {
  beforeEach(() => {
    mockGetEntry.mockReset();
    mockDelete.mockReset();
    mockSetSession.mockReset();
    mockLogin.mockReset();
    mockComplete2fa.mockReset();
    // Restore default implementations after reset
    mockGetEntry.mockReturnValue(undefined);
  });

  it('returns logged_in if already connected with logged_in status', async () => {
    mockGetEntry.mockReturnValueOnce({ status: 'logged_in', request: {} });
    const result = await autoConnectInstance('user-1', makeInstance());
    expect(result.state).toBe('logged_in');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('preserves need_2fa session and returns need_2fa without re-logging in', async () => {
    mockGetEntry.mockReturnValueOnce({ status: 'need_2fa', request: {} });
    const result = await autoConnectInstance('user-1', makeInstance());
    expect(result.state).toBe('need_2fa');
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('re-logins if existing session is expired', async () => {
    mockGetEntry.mockReturnValueOnce({ status: 'expired', request: {} });
    mockLogin.mockResolvedValueOnce({ state: 'logged_in', mychartRequest: {} as never });
    const result = await autoConnectInstance('user-1', makeInstance());
    expect(result.state).toBe('logged_in');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockLogin).toHaveBeenCalled();
  });

  it('returns logged_in on successful login without 2FA', async () => {
    mockGetEntry.mockReturnValueOnce(undefined);
    mockLogin.mockResolvedValueOnce({ state: 'logged_in', mychartRequest: {} as never });
    const result = await autoConnectInstance('user-1', makeInstance());
    expect(result.state).toBe('logged_in');
    expect(mockSetSession).toHaveBeenCalled();
  });

  it('returns error on invalid login', async () => {
    mockGetEntry.mockReturnValueOnce(undefined);
    mockLogin.mockResolvedValueOnce({ state: 'invalid_login' } as never);
    const result = await autoConnectInstance('user-1', makeInstance());
    expect(result.state).toBe('error');
  });

  it('auto-completes 2FA with TOTP secret', async () => {
    mockGetEntry.mockReturnValueOnce(undefined);
    mockLogin.mockResolvedValueOnce({ state: 'need_2fa', mychartRequest: {} as never });
    mockComplete2fa.mockResolvedValueOnce({ state: 'logged_in', mychartRequest: {} as never });

    const result = await autoConnectInstance('user-1', makeInstance({ totpSecret: 'ABCDEF' }));
    expect(result.state).toBe('logged_in');
    expect(mockComplete2fa).toHaveBeenCalled();
  });

  it('returns need_2fa when no TOTP secret', async () => {
    mockGetEntry.mockReturnValueOnce(undefined);
    mockLogin.mockResolvedValueOnce({ state: 'need_2fa', mychartRequest: {} as never });

    const result = await autoConnectInstance('user-1', makeInstance({ totpSecret: null }));
    expect(result.state).toBe('need_2fa');
    // need_2fa path stores via sessionStore.set(), not setSession()
    expect(mockSetSession).not.toHaveBeenCalled();
  });
});
