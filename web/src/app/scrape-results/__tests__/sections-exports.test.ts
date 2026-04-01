import { describe, it, expect } from 'bun:test';

// Verify all section components are properly exported and importable.
// This catches broken imports, missing dependencies, and module resolution issues.

describe('section exports', () => {
  describe('medical-data-sections', () => {
    it('exports all expected section components', async () => {
      const mod = await import('../sections/medical-data-sections');

      const expectedExports = [
        'ProfileSection',
        'HealthSummarySection',
        'MedicationsSection',
        'AllergiesSection',
        'ImmunizationsSection',
        'InsuranceSection',
        'CareTeamSection',
        'ReferralsSection',
        'HealthIssuesSection',
        'VitalsSection',
        'EmergencyContactsSection',
        'MedicalHistorySection',
        'PreventiveCareSection',
        'GoalsSection',
        'DocumentsSection',
        'ActivityFeedSection',
        'UpcomingVisitsSection',
        'PastVisitsSection',
        'LabResultsSection',
        'UpcomingOrdersSection',
        'QuestionnairesSection',
        'CareJourneysSection',
        'EducationMaterialsSection',
        'EhiExportSection',
        'LinkedAccountsSection',
      ];

      for (const name of expectedExports) {
        expect(typeof (mod as Record<string, unknown>)[name]).toBe('function');
      }
    });

    it('exports exactly the expected number of components', async () => {
      const mod = await import('../sections/medical-data-sections');
      const exportedFunctions = Object.entries(mod).filter(
        ([, v]) => typeof v === 'function'
      );
      expect(exportedFunctions.length).toBe(25);
    });
  });

  describe('messaging-section', () => {
    it('exports MessagingSection', async () => {
      const mod = await import('../sections/messaging-section');
      expect(typeof mod.MessagingSection).toBe('function');
    });
  });

  describe('billing-section', () => {
    it('exports BillingSection', async () => {
      const mod = await import('../sections/billing-section');
      expect(typeof mod.BillingSection).toBe('function');
    });
  });

  describe('imaging-section', () => {
    it('exports ImagingSection', async () => {
      const mod = await import('../sections/imaging-section');
      expect(typeof mod.ImagingSection).toBe('function');
    });
  });

  describe('letters-section', () => {
    it('exports LettersSection', async () => {
      const mod = await import('../sections/letters-section');
      expect(typeof mod.LettersSection).toBe('function');
    });
  });

  describe('use-scrape-actions hook', () => {
    it('exports useScrapeActions', async () => {
      const mod = await import('../hooks/use-scrape-actions');
      expect(typeof mod.useScrapeActions).toBe('function');
    });
  });
});
