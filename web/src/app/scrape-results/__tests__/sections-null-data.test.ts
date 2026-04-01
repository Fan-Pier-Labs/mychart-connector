import { describe, it, expect } from 'bun:test';

// Test that section components without hooks handle null/undefined/empty data gracefully.
// Components with hooks (Billing, Imaging, Letters, Messaging) can't be tested by
// direct function call without a React renderer — they're covered by export tests instead.

describe('section components handle null/undefined data', () => {
  describe('PastVisitsSection', () => {
    it('returns null for undefined pastVisits', async () => {
      const { PastVisitsSection } = await import('../sections/medical-data-sections');
      const result = PastVisitsSection({ pastVisits: undefined });
      expect(result).toBeNull();
    });

    it('returns null when pastVisits has error', async () => {
      const { PastVisitsSection } = await import('../sections/medical-data-sections');
      const result = PastVisitsSection({ pastVisits: { error: 'some error' } });
      expect(result).toBeNull();
    });

    it('returns null when pastVisits has no List', async () => {
      const { PastVisitsSection } = await import('../sections/medical-data-sections');
      const result = PastVisitsSection({ pastVisits: {} });
      expect(result).toBeNull();
    });
  });

  describe('LabResultsSection', () => {
    it('returns null for undefined labResults', async () => {
      const { LabResultsSection } = await import('../sections/medical-data-sections');
      const result = LabResultsSection({ labResults: undefined });
      expect(result).toBeNull();
    });

    it('returns null for empty array', async () => {
      const { LabResultsSection } = await import('../sections/medical-data-sections');
      const result = LabResultsSection({ labResults: [] });
      expect(result).toBeNull();
    });
  });

  describe('ProfileSection', () => {
    it('returns null when profile is missing', async () => {
      const { ProfileSection } = await import('../sections/medical-data-sections');
      const result = ProfileSection({ results: {} });
      expect(result).toBeNull();
    });

    it('returns null when profile has error', async () => {
      const { ProfileSection } = await import('../sections/medical-data-sections');
      const result = ProfileSection({ results: { profile: { error: 'failed' } } });
      expect(result).toBeNull();
    });
  });
});
