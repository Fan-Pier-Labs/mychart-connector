import { describe, test, expect, mock, beforeEach } from 'bun:test';

// Set up all mocks before importing
const mockInstances: unknown[] = [];
let mockConnectResult = 'logged_in';
let updateCalls: unknown[][] = [];
let emailCalls: unknown[][] = [];
let mockChanges: { changes: unknown[]; newImagingResults: unknown[] } = { changes: [], newImagingResults: [] };

mock.module('@/lib/db', () => ({
  getNotificationEnabledInstances: () => Promise.resolve(mockInstances),
  updateNotificationLastChecked: (...args: unknown[]) => { updateCalls.push(args); return Promise.resolve(); },
  // Stub remaining exports so other test files importing @/lib/db don't break
  createMyChartInstance: () => Promise.resolve({}),
  getMyChartInstances: () => Promise.resolve([]),
  getMyChartInstance: () => Promise.resolve(null),
  updateMyChartInstance: () => Promise.resolve(null),
  deleteMyChartInstance: () => Promise.resolve(false),
  getUserNotificationPreferences: () => Promise.resolve({ enabled: false, includeContent: false }),
  setUserNotificationPreferences: () => Promise.resolve(),
}));

mock.module('@/lib/mcp/auto-connect', () => ({
  autoConnectInstance: () => Promise.resolve(mockConnectResult),
}));

mock.module('@/lib/sessions', () => ({
  getSession: () => ({} as never),
  setSession: () => {},
  deleteSession: () => {},
  getSessionMetadata: () => undefined,
  randomToken: () => 'mock-token',
  sessionStore: { getEntry: () => null, set: () => {}, delete: () => {} },
  SESSION_COOKIE_NAME: 'session_token',
  SESSION_COOKIE_MAX_AGE: 86400,
}));

// Mock change-detector itself so we don't need to mock all 10 scrapers
mock.module('@/lib/notifications/change-detector', () => ({
  detectChanges: () => Promise.resolve(mockChanges),
}));

mock.module('@/lib/notifications/email', () => ({
  sendNotificationEmail: (...args: unknown[]) => { emailCalls.push(args); return Promise.resolve(); },
}));

mock.module('@/lib/notifications/imaging', () => ({
  getImagingAttachments: () => Promise.resolve([]),
}));

// Don't mock templates — let the real buildSummaryEmail/buildDetailedEmail run.
// Mocking them here would leak to templates.test.ts via Bun's global mock.module.

const { checkAllUsers } = await import('../check');

function makeInstance(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inst1', userId: 'user1', hostname: 'mychart.example.org',
    username: 'test', password: 'pass', totpSecret: 'secret',
    mychartEmail: null, createdAt: new Date(), updatedAt: new Date(),
    notificationsLastCheckedAt: new Date('2026-03-11T00:00:00Z'),
    userEmail: 'test@example.com', includeContent: false,
    ...overrides,
  };
}

describe('checkAllUsers', () => {
  beforeEach(() => {
    mockInstances.length = 0;
    mockConnectResult = 'logged_in';
    mockChanges = { changes: [], newImagingResults: [] };
    updateCalls = [];
    emailCalls = [];
  });

  test('returns zeros when no instances are enabled', async () => {
    const result = await checkAllUsers();
    expect(result).toEqual({ checked: 0, sent: 0, errors: 0 });
  });

  test('establishes baseline on first run (null lastCheckedAt)', async () => {
    mockInstances.push(makeInstance({ notificationsLastCheckedAt: null }));

    const result = await checkAllUsers();

    expect(result.checked).toBe(1);
    expect(result.sent).toBe(0);
    expect(updateCalls.length).toBe(1);
    expect(emailCalls.length).toBe(0);
  });

  test('sends email when changes detected', async () => {
    mockInstances.push(makeInstance());
    mockChanges = {
      changes: [{ category: 'Messages', newItems: [{ text: 'hi' }] }],
      newImagingResults: [],
    };

    const result = await checkAllUsers();

    expect(result.checked).toBe(1);
    expect(result.sent).toBe(1);
    expect(emailCalls.length).toBe(1);
  });

  test('does not send email when no changes detected', async () => {
    mockInstances.push(makeInstance());

    const result = await checkAllUsers();

    expect(result.checked).toBe(1);
    expect(result.sent).toBe(0);
    expect(emailCalls.length).toBe(0);
  });

  test('counts error when auto-connect fails', async () => {
    mockInstances.push(makeInstance());
    mockConnectResult = 'error';

    const result = await checkAllUsers();

    expect(result.errors).toBe(1);
    expect(result.sent).toBe(0);
  });

  test('instance with passkey but no TOTP is included in notification checks', async () => {
    // The SQL query now uses: (encrypted_totp_secret IS NOT NULL OR encrypted_passkey_credential IS NOT NULL)
    // An instance with only a passkey credential should still be processed.
    mockInstances.push(makeInstance({ totpSecret: null, passkeyCredential: '{"credentialId":"abc"}' }));

    const result = await checkAllUsers();
    // Should process (checked=1), not error, no email sent (no changes)
    expect(result.checked).toBe(1);
    expect(result.errors).toBe(0);
  });

  test('disabled instances are excluded by getNotificationEnabledInstances SQL filter', async () => {
    // getNotificationEnabledInstances adds `AND mi.enabled = TRUE` to the query,
    // so disabled instances never appear in mockInstances at all.
    // When no instances are returned, checkAllUsers returns zeros.
    // This test verifies the behavior when the DB returns nothing (simulating all disabled).
    // mockInstances is already empty from beforeEach.
    const result = await checkAllUsers();
    expect(result).toEqual({ checked: 0, sent: 0, errors: 0 });
    expect(emailCalls.length).toBe(0);
    expect(updateCalls.length).toBe(0);
  });
});
