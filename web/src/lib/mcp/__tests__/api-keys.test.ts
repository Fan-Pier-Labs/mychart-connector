import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { createHash } from 'crypto';

// Mock pg Pool
const mockQuery = mock(() => Promise.resolve({ rows: [], rowCount: 0 }));
mock.module('pg', () => ({
  Pool: class MockPool {
    query = mockQuery;
  },
}));

// Mock config
mock.module('../config', () => ({
  getPoolOptions: () => Promise.resolve({ connectionString: 'postgresql://localhost/test', ssl: false }),
}));

// Import after mocks
const { generateApiKey, validateApiKey, revokeApiKey, hasApiKey } = await import('../api-keys');

describe('API key helpers', () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  describe('generateApiKey', () => {
    it('generates a 64-char hex key and stores its SHA-256 hash', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'user-1' }], rowCount: 1 });
      const key = await generateApiKey('user-1');

      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[a-f0-9]{64}$/);

      // Verify the stored hash matches
      const expectedHash = createHash('sha256').update(key).digest('hex');
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE "user" SET mcp_api_key_hash = $1 WHERE id = $2',
        [expectedHash, 'user-1']
      );
    });
  });

  describe('validateApiKey', () => {
    it('returns userId for valid key', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'user-1' }], rowCount: 1 });
      const result = await validateApiKey('some-key');

      expect(result).toEqual({ userId: 'user-1' });
      const expectedHash = createHash('sha256').update('some-key').digest('hex');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id FROM "user" WHERE mcp_api_key_hash = $1',
        [expectedHash]
      );
    });

    it('returns null for invalid key', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const result = await validateApiKey('bad-key');

      expect(result).toBeNull();
    });
  });

  describe('revokeApiKey', () => {
    it('sets hash to NULL for user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      await revokeApiKey('user-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE "user" SET mcp_api_key_hash = NULL WHERE id = $1',
        ['user-1']
      );
    });
  });

  describe('hasApiKey', () => {
    it('returns true when user has a key', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ mcp_api_key_hash: 'abc123' }], rowCount: 1 });
      expect(await hasApiKey('user-1')).toBe(true);
    });

    it('returns false when user has no key', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ mcp_api_key_hash: null }], rowCount: 1 });
      expect(await hasApiKey('user-1')).toBe(false);
    });

    it('returns false when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      expect(await hasApiKey('nonexistent')).toBe(false);
    });
  });
});
