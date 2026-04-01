import { describe, it, expect } from 'bun:test';

// Verify all section components and hooks are properly exported and importable.
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

  describe('messaging', () => {
    it('exports MessagingSection', async () => {
      const mod = await import('../sections/messaging/messaging-section');
      expect(typeof mod.MessagingSection).toBe('function');
    });

    it('exports useMessaging hook', async () => {
      const mod = await import('../sections/messaging/use-messaging');
      expect(typeof mod.useMessaging).toBe('function');
    });
  });

  describe('billing', () => {
    it('exports BillingSection', async () => {
      const mod = await import('../sections/billing/billing-section');
      expect(typeof mod.BillingSection).toBe('function');
    });

    it('exports useBilling hook', async () => {
      const mod = await import('../sections/billing/use-billing');
      expect(typeof mod.useBilling).toBe('function');
    });
  });

  describe('imaging', () => {
    it('exports ImagingSection', async () => {
      const mod = await import('../sections/imaging/imaging-section');
      expect(typeof mod.ImagingSection).toBe('function');
    });

    it('exports useImaging hook', async () => {
      const mod = await import('../sections/imaging/use-imaging');
      expect(typeof mod.useImaging).toBe('function');
    });
  });

  describe('letters', () => {
    it('exports LettersSection', async () => {
      const mod = await import('../sections/letters/letters-section');
      expect(typeof mod.LettersSection).toBe('function');
    });

    it('exports useLetters hook', async () => {
      const mod = await import('../sections/letters/use-letters');
      expect(typeof mod.useLetters).toBe('function');
    });
  });
});
