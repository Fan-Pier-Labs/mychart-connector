import { describe, it, expect } from 'bun:test';

// Verify all home page component folders export their components and hooks correctly.
// This catches broken imports, missing dependencies, and module resolution issues.

describe('home page component exports', () => {
  describe('mychart-accounts', () => {
    it('exports MyChartAccountsCard', async () => {
      const mod = await import('../mychart-accounts/mychart-accounts-card');
      expect(typeof mod.MyChartAccountsCard).toBe('function');
    });

    it('exports useMyChartAccounts hook', async () => {
      const mod = await import('../mychart-accounts/use-mychart-accounts');
      expect(typeof mod.useMyChartAccounts).toBe('function');
    });

    it('exports TwofaPrompt', async () => {
      const mod = await import('../mychart-accounts/twofa-prompt');
      expect(typeof mod.TwofaPrompt).toBe('function');
    });

    it('exports TotpSetupPrompt', async () => {
      const mod = await import('../mychart-accounts/totp-setup-prompt');
      expect(typeof mod.TotpSetupPrompt).toBe('function');
    });
  });

  describe('profile-card', () => {
    it('exports ProfileCard', async () => {
      const mod = await import('../profile-card/profile-card');
      expect(typeof mod.ProfileCard).toBe('function');
    });
  });

  describe('scrape-card', () => {
    it('exports ScrapeCard', async () => {
      const mod = await import('../scrape-card/scrape-card');
      expect(typeof mod.ScrapeCard).toBe('function');
    });
  });

  describe('mcp-card', () => {
    it('exports McpCard', async () => {
      const mod = await import('../mcp-card/mcp-card');
      expect(typeof mod.McpCard).toBe('function');
    });

    it('exports useMcp hook', async () => {
      const mod = await import('../mcp-card/use-mcp');
      expect(typeof mod.useMcp).toBe('function');
    });
  });

  describe('notifications-card', () => {
    it('exports NotificationsCard', async () => {
      const mod = await import('../notifications-card/notifications-card');
      expect(typeof mod.NotificationsCard).toBe('function');
    });

    it('exports useNotifications hook', async () => {
      const mod = await import('../notifications-card/use-notifications');
      expect(typeof mod.useNotifications).toBe('function');
    });
  });

  describe('security-card', () => {
    it('exports SecurityCard', async () => {
      const mod = await import('../security-card/security-card');
      expect(typeof mod.SecurityCard).toBe('function');
    });

    it('exports useSecurity hook', async () => {
      const mod = await import('../security-card/use-security');
      expect(typeof mod.useSecurity).toBe('function');
    });
  });

  describe('page', () => {
    it('exports default HomePage', async () => {
      const mod = await import('../page');
      expect(typeof mod.default).toBe('function');
    });
  });
});
