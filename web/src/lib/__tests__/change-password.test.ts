import { describe, it, expect } from 'bun:test';
import { validateChangePassword } from '../change-password';

describe('validateChangePassword', () => {
  it('returns null for valid inputs', () => {
    expect(validateChangePassword('oldpass1', 'newpass12', 'newpass12')).toBeNull();
  });

  it('rejects empty current password', () => {
    expect(validateChangePassword('', 'newpass12', 'newpass12')).toBe('Please fill in all fields.');
  });

  it('rejects empty new password', () => {
    expect(validateChangePassword('oldpass1', '', 'newpass12')).toBe('Please fill in all fields.');
  });

  it('rejects empty confirm password', () => {
    expect(validateChangePassword('oldpass1', 'newpass12', '')).toBe('Please fill in all fields.');
  });

  it('rejects new password shorter than 8 characters', () => {
    expect(validateChangePassword('oldpass1', 'short', 'short')).toBe('New password must be at least 8 characters.');
  });

  it('accepts exactly 8 character password', () => {
    expect(validateChangePassword('oldpass1', '12345678', '12345678')).toBeNull();
  });

  it('rejects mismatched new and confirm passwords', () => {
    expect(validateChangePassword('oldpass1', 'newpass12', 'newpass99')).toBe('New passwords do not match.');
  });

  it('checks length before checking match', () => {
    // Short and mismatched — should get the length error first
    expect(validateChangePassword('oldpass1', 'short', 'other')).toBe('New password must be at least 8 characters.');
  });
});
