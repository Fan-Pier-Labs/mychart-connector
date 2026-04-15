import { describe, it, expect, mock } from 'bun:test';
import { randomBytes } from 'crypto';

mock.module('../config', () => ({
  getEncryptionKey: () => Promise.resolve('test-env-secret-0123456789abcdef'),
}));

const {
  encrypt,
  decrypt,
  encryptWithClientKey,
  decryptWithClientKey,
  encryptLayered,
  decryptLayered,
} = await import('../encryption');

const CEK = randomBytes(32).toString('hex');
const OTHER_CEK = randomBytes(32).toString('hex');

describe('encryption', () => {
  describe('env-only encrypt/decrypt', () => {
    it('round-trips', async () => {
      const enc = await encrypt('hello world');
      expect(await decrypt(enc)).toBe('hello world');
    });
  });

  describe('client-key encrypt/decrypt', () => {
    it('round-trips with matching CEK', () => {
      const enc = encryptWithClientKey('secret', CEK);
      expect(decryptWithClientKey(enc, CEK)).toBe('secret');
    });

    it('fails with wrong CEK', () => {
      const enc = encryptWithClientKey('secret', CEK);
      expect(() => decryptWithClientKey(enc, OTHER_CEK)).toThrow();
    });

    it('rejects malformed CEK', () => {
      expect(() => encryptWithClientKey('x', 'not-hex')).toThrow();
    });
  });

  describe('layered encrypt/decrypt', () => {
    it('round-trips', async () => {
      const enc = await encryptLayered('Homer Donuts 123', CEK);
      expect(await decryptLayered(enc, CEK)).toBe('Homer Donuts 123');
    });

    it('env key alone is insufficient — outer decrypt yields inner ciphertext, not plaintext', async () => {
      const enc = await encryptLayered('plaintext-password', CEK);
      const innerOnly = await decrypt(enc);
      expect(innerOnly).not.toContain('plaintext-password');
      expect(innerOnly).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('fails with wrong CEK after outer decrypt', async () => {
      const enc = await encryptLayered('x', CEK);
      await expect(decryptLayered(enc, OTHER_CEK)).rejects.toThrow();
    });

    it('tampered ciphertext fails auth tag', async () => {
      const enc = await encryptLayered('x', CEK);
      const tampered = enc.slice(0, -4) + 'AAAA';
      await expect(decryptLayered(tampered, CEK)).rejects.toThrow();
    });
  });
});
