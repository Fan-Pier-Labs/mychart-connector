import { describe, it, expect } from 'bun:test';

// Test that section components handle null/undefined/empty data gracefully.
// These components use withRenderErrorBoundary and null checks, so passing
// undefined should return null (no crash).

describe('section components handle null/undefined data', () => {
  describe('BillingSection', () => {
    it('returns null for undefined billing', async () => {
      const { BillingSection } = await import('../sections/billing-section');
      const result = BillingSection({
        billing: undefined,
        isDemo: false,
        loadingStatements: {},
        fetchStatementPdf: async () => {},
      });
      expect(result).toBeNull();
    });

    it('returns null for empty array', async () => {
      const { BillingSection } = await import('../sections/billing-section');
      const result = BillingSection({
        billing: [],
        isDemo: false,
        loadingStatements: {},
        fetchStatementPdf: async () => {},
      });
      expect(result).toBeNull();
    });
  });

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

  describe('MessagingSection', () => {
    it('returns null when messages is undefined', async () => {
      const { MessagingSection } = await import('../sections/messaging-section');
      const mockActions = {
        replyingTo: null, setReplyingTo: () => {}, replyText: '', setReplyText: () => {},
        sendingReply: false, showComposeNew: false, setShowComposeNew: () => {},
        composeRecipients: [], composeTopics: [], composeLoading: false,
        selectedRecipient: null, setSelectedRecipient: () => {},
        selectedTopic: null, setSelectedTopic: () => {},
        composeSubject: '', setComposeSubject: () => {},
        composeBody: '', setComposeBody: () => {},
        sendingNew: false, messageStatus: null, replyTextareaRef: { current: null },
        handleSendReply: async () => {}, handleOpenCompose: async () => {}, handleSendNew: async () => {},
      };
      const result = MessagingSection({
        messages: undefined,
        isDemo: false,
        token: 'tok',
        actions: mockActions,
      });
      expect(result).toBeNull();
    });

    it('returns null when messages has error', async () => {
      const { MessagingSection } = await import('../sections/messaging-section');
      const mockActions = {
        replyingTo: null, setReplyingTo: () => {}, replyText: '', setReplyText: () => {},
        sendingReply: false, showComposeNew: false, setShowComposeNew: () => {},
        composeRecipients: [], composeTopics: [], composeLoading: false,
        selectedRecipient: null, setSelectedRecipient: () => {},
        selectedTopic: null, setSelectedTopic: () => {},
        composeSubject: '', setComposeSubject: () => {},
        composeBody: '', setComposeBody: () => {},
        sendingNew: false, messageStatus: null, replyTextareaRef: { current: null },
        handleSendReply: async () => {}, handleOpenCompose: async () => {}, handleSendNew: async () => {},
      };
      const result = MessagingSection({
        messages: { error: 'failed' },
        isDemo: false,
        token: 'tok',
        actions: mockActions,
      });
      expect(result).toBeNull();
    });
  });
});
