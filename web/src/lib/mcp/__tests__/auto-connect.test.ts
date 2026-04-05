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
const mockGetSession = mock(() => undefined);
const mockDeleteSession = mock(() => {});
const mockGetSessionMetadata = mock(() => undefined);
const mockRandomToken = mock(() => 'mock-token');
mock.module('../../sessions', () => ({
  getSession: mockGetSession,
  setSession: mockSetSession,
  deleteSession: mockDeleteSession,
  getSessionMetadata: mockGetSessionMetadata,
  randomToken: mockRandomToken,
  sessionStore: {
    getEntry: mockGetEntry,
    set: mock(() => {}),
    delete: mockDelete,
  },
  SESSION_COOKIE_NAME: 'session_token',
  SESSION_COOKIE_MAX_AGE: 86400,
}));

// Import real implementations to re-export alongside mocks, so other test
// files that import from the same module are not broken by partial mocks.
const realLogin = await import('../../mychart/login');

// Mock login module
const mockLogin = mock(() => Promise.resolve({ state: 'logged_in' as const, mychartRequest: {} }));
const mockComplete2fa = mock(() => Promise.resolve({ state: 'logged_in' as const, mychartRequest: {} }));
const mockPasskeyLogin = mock(() => Promise.resolve({ state: 'logged_in' as const, mychartRequest: {} }));
const mockDeserializeCredential = mock((json: string) => JSON.parse(json));
const mockSerializeCredential = mock((cred: unknown) => JSON.stringify(cred));
mock.module('../../mychart/login', () => ({
  ...realLogin,
  myChartUserPassLogin: mockLogin,
  complete2faFlow: mockComplete2fa,
  myChartPasskeyLogin: mockPasskeyLogin,
  deserializeCredential: mockDeserializeCredential,
  serializeCredential: mockSerializeCredential,
}));

// Mock db module for passkey credential updates
const mockUpdateMyChartInstance = mock(() => Promise.resolve(null));
mock.module('../../db', () => ({
  createMyChartInstance: mock(() => Promise.resolve({})),
  getMyChartInstances: mock(() => Promise.resolve([])),
  getMyChartInstance: mock(() => Promise.resolve(null)),
  updateMyChartInstance: mockUpdateMyChartInstance,
  deleteMyChartInstance: mock(() => Promise.resolve(false)),
  getNotificationEnabledInstances: mock(() => Promise.resolve([])),
  updateNotificationLastChecked: mock(() => Promise.resolve()),
  getUserNotificationPreferences: mock(() => Promise.resolve({ enabled: false, includeContent: false })),
  setUserNotificationPreferences: mock(() => Promise.resolve()),
}));

// Mock TOTP
mock.module('../../mychart/totp', () => ({
  generateTotpCode: () => Promise.resolve('123456'),
}));

const { autoConnectInstance } = await import('../auto-connect');

const FAKE_PASSKEY_CREDENTIAL = JSON.stringify({
  credentialId: 'dGVzdC1jcmVk',
  privateKey: 'dGVzdC1rZXk=',
  rpId: 'mychart.example.com',
  userHandle: 'dGVzdC11c2Vy',
  signCount: 0,
});

function makeInstance(overrides: Partial<MyChartInstance> = {}): MyChartInstance {
  return {
    id: 'inst-1',
    userId: 'user-1',
    hostname: 'mychart.example.com',
    username: 'testuser',
    password: 'testpass',
    totpSecret: null,
    passkeyCredential: null,
    mychartEmail: null,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    notificationsLastCheckedAt: null,
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
    mockPasskeyLogin.mockReset();
    mockUpdateMyChartInstance.mockReset();
    mockDeserializeCredential.mockReset();
    mockSerializeCredential.mockReset();
    // Restore default implementations after reset
    mockGetEntry.mockReturnValue(undefined);
    mockDeserializeCredential.mockImplementation((json: string) => JSON.parse(json));
    mockSerializeCredential.mockImplementation((cred: unknown) => JSON.stringify(cred));
    mockUpdateMyChartInstance.mockResolvedValue(null);
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

  // ── Passkey login tests ──

  it('uses passkey login when credential exists', async () => {
    mockGetEntry.mockReturnValueOnce(undefined);
    mockPasskeyLogin.mockResolvedValueOnce({ state: 'logged_in', mychartRequest: {} as never });

    const result = await autoConnectInstance('user-1', makeInstance({ passkeyCredential: FAKE_PASSKEY_CREDENTIAL }));
    expect(result.state).toBe('logged_in');
    expect(mockPasskeyLogin).toHaveBeenCalled();
    expect(mockLogin).not.toHaveBeenCalled(); // should NOT fall back to password login
    expect(mockSetSession).toHaveBeenCalled();
  });

  it('persists updated signCount after successful passkey login', async () => {
    mockGetEntry.mockReturnValueOnce(undefined);
    mockPasskeyLogin.mockResolvedValueOnce({ state: 'logged_in', mychartRequest: {} as never });

    await autoConnectInstance('user-1', makeInstance({ passkeyCredential: FAKE_PASSKEY_CREDENTIAL }));
    // updateMyChartInstance should be called to persist updated signCount
    expect(mockUpdateMyChartInstance).toHaveBeenCalledWith('inst-1', 'user-1', expect.objectContaining({
      passkeyCredential: expect.any(String),
    }));
  });

  it('clears passkey credential and falls back to password login on passkey failure', async () => {
    mockGetEntry.mockReturnValueOnce(undefined);
    mockPasskeyLogin.mockResolvedValueOnce({ state: 'invalid_login', mychartRequest: {} as never });
    mockLogin.mockResolvedValueOnce({ state: 'logged_in', mychartRequest: {} as never });

    const result = await autoConnectInstance('user-1', makeInstance({ passkeyCredential: FAKE_PASSKEY_CREDENTIAL }));
    expect(result.state).toBe('logged_in');
    // Should have cleared the passkey credential
    expect(mockUpdateMyChartInstance).toHaveBeenCalledWith('inst-1', 'user-1', { passkeyCredential: null });
    // Should have fallen back to password login
    expect(mockLogin).toHaveBeenCalled();
  });

  it('clears passkey credential and falls back on passkey error', async () => {
    mockGetEntry.mockReturnValueOnce(undefined);
    mockPasskeyLogin.mockResolvedValueOnce({ state: 'error', mychartRequest: {} as never });
    mockLogin.mockResolvedValueOnce({ state: 'logged_in', mychartRequest: {} as never });

    const result = await autoConnectInstance('user-1', makeInstance({ passkeyCredential: FAKE_PASSKEY_CREDENTIAL }));
    expect(result.state).toBe('logged_in');
    expect(mockUpdateMyChartInstance).toHaveBeenCalledWith('inst-1', 'user-1', { passkeyCredential: null });
    expect(mockLogin).toHaveBeenCalled();
  });

  it('clears passkey credential and falls back when passkey login throws', async () => {
    mockGetEntry.mockReturnValueOnce(undefined);
    mockPasskeyLogin.mockRejectedValueOnce(new Error('network error'));
    mockLogin.mockResolvedValueOnce({ state: 'logged_in', mychartRequest: {} as never });

    const result = await autoConnectInstance('user-1', makeInstance({ passkeyCredential: FAKE_PASSKEY_CREDENTIAL }));
    expect(result.state).toBe('logged_in');
    expect(mockUpdateMyChartInstance).toHaveBeenCalledWith('inst-1', 'user-1', { passkeyCredential: null });
    expect(mockLogin).toHaveBeenCalled();
  });

  it('skips passkey and goes to password login when no passkey credential', async () => {
    mockGetEntry.mockReturnValueOnce(undefined);
    mockLogin.mockResolvedValueOnce({ state: 'logged_in', mychartRequest: {} as never });

    const result = await autoConnectInstance('user-1', makeInstance({ passkeyCredential: null }));
    expect(result.state).toBe('logged_in');
    expect(mockPasskeyLogin).not.toHaveBeenCalled();
    expect(mockLogin).toHaveBeenCalled();
  });

  it('still returns logged_in when signCount persist fails after successful passkey login', async () => {
    mockGetEntry.mockReturnValueOnce(undefined);
    mockPasskeyLogin.mockResolvedValueOnce({ state: 'logged_in', mychartRequest: {} as never });
    // First call is signCount persist (fails), not credential clear
    mockUpdateMyChartInstance.mockRejectedValueOnce(new Error('db write failed'));

    const result = await autoConnectInstance('user-1', makeInstance({ passkeyCredential: FAKE_PASSKEY_CREDENTIAL }));
    expect(result.state).toBe('logged_in');
    expect(mockSetSession).toHaveBeenCalled();
  });

  it('clears invalid passkey credential that fails to deserialize', async () => {
    mockGetEntry.mockReturnValueOnce(undefined);
    mockDeserializeCredential.mockImplementationOnce(() => { throw new Error('invalid JSON'); });
    mockLogin.mockResolvedValueOnce({ state: 'logged_in', mychartRequest: {} as never });

    const result = await autoConnectInstance('user-1', makeInstance({ passkeyCredential: 'not-valid-json' }));
    expect(result.state).toBe('logged_in');
    // Should clear the corrupt credential
    expect(mockUpdateMyChartInstance).toHaveBeenCalledWith('inst-1', 'user-1', { passkeyCredential: null });
    // Should fall back to password login
    expect(mockLogin).toHaveBeenCalled();
  });
});
