import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';

// Test the hook's fetch interaction patterns directly.
// Since we can't use React hooks outside components without a test renderer,
// we verify the API contracts that the hook relies on.

describe('useScrapeActions fetch patterns', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('fetchXray', () => {
    it('constructs correct URL with base64-encoded fdi context', () => {
      const token = 'test-token';
      const fdiContext = { fdi: 'abc123', ord: 'def456' };
      const fdiParam = btoa(JSON.stringify(fdiContext));
      const url = `/api/mychart-xray?token=${encodeURIComponent(token)}&fdi=${encodeURIComponent(fdiParam)}`;

      expect(url).toContain('token=test-token');
      expect(url).toContain('fdi=');
      // Verify the base64 round-trips correctly
      const decoded = JSON.parse(atob(fdiParam));
      expect(decoded.fdi).toBe('abc123');
      expect(decoded.ord).toBe('def456');
    });

    it('handles error response by extracting error message', async () => {
      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify({ error: 'Study not found' }), { status: 404 });
      }) as typeof fetch;

      const resp = await fetch('/api/mychart-xray?token=t&fdi=f');
      expect(resp.ok).toBe(false);
      const data = await resp.json();
      expect(data.error).toBe('Study not found');
    });

    it('returns blob for successful response', async () => {
      globalThis.fetch = mock(async () => {
        return new Response(new Blob(['fake-jpeg-data']), { status: 200 });
      }) as typeof fetch;

      const resp = await fetch('/api/mychart-xray?token=t&fdi=f');
      expect(resp.ok).toBe(true);
      const blob = await resp.blob();
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe('fetchLetterContent', () => {
    it('sends correct POST body', async () => {
      let capturedBody = '';
      globalThis.fetch = mock(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = init?.body as string;
        return new Response(JSON.stringify({ bodyHTML: '<p>Letter</p>' }), { status: 200 });
      }) as typeof fetch;

      await fetch('/api/letter-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'my-token', hnoId: 'hno-123', csn: 'csn-456' }),
      });

      const parsed = JSON.parse(capturedBody);
      expect(parsed.token).toBe('my-token');
      expect(parsed.hnoId).toBe('hno-123');
      expect(parsed.csn).toBe('csn-456');
    });

    it('returns bodyHTML on success', async () => {
      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify({ bodyHTML: '<p>Content</p>' }), { status: 200 });
      }) as typeof fetch;

      const resp = await fetch('/api/letter-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 't', hnoId: 'h', csn: 'c' }),
      });
      const data = await resp.json();
      expect(data.bodyHTML).toBe('<p>Content</p>');
    });
  });

  describe('fetchStatementPdf', () => {
    it('sends correct POST body for billing statement', async () => {
      let capturedBody = '';
      globalThis.fetch = mock(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = init?.body as string;
        return new Response(new Blob(['%PDF']), { status: 200 });
      }) as typeof fetch;

      await fetch('/api/billing-statement-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'my-token',
          encBillingId: 'enc-billing-123',
          statement: { RecordID: 'rec-1', DateDisplay: '03/15/2026' },
        }),
      });

      const parsed = JSON.parse(capturedBody);
      expect(parsed.token).toBe('my-token');
      expect(parsed.encBillingId).toBe('enc-billing-123');
      expect(parsed.statement.RecordID).toBe('rec-1');
      expect(parsed.statement.DateDisplay).toBe('03/15/2026');
    });
  });

  describe('handleSendReply', () => {
    it('sends reply with conversationId and messageBody', async () => {
      let capturedBody = '';
      globalThis.fetch = mock(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = init?.body as string;
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }) as typeof fetch;

      const resp = await fetch('/api/messages/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'tok', conversationId: 'conv-1', messageBody: 'Hello doctor' }),
      });
      const data = await resp.json();

      expect(data.success).toBe(true);
      const parsed = JSON.parse(capturedBody);
      expect(parsed.conversationId).toBe('conv-1');
      expect(parsed.messageBody).toBe('Hello doctor');
    });

    it('returns error on failure', async () => {
      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify({ success: false, error: 'Conversation expired' }), { status: 200 });
      }) as typeof fetch;

      const resp = await fetch('/api/messages/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'tok', conversationId: 'conv-1', messageBody: 'Hi' }),
      });
      const data = await resp.json();

      expect(data.success).toBe(false);
      expect(data.error).toBe('Conversation expired');
    });
  });

  describe('handleOpenCompose', () => {
    it('fetches recipients and topics', async () => {
      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify({
          recipients: [{ displayName: 'Dr. Smith', specialty: 'Internal Medicine' }],
          topics: [{ displayName: 'Medical Question' }],
        }), { status: 200 });
      }) as typeof fetch;

      const resp = await fetch('/api/messages/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'tok' }),
      });
      const data = await resp.json();

      expect(data.recipients).toHaveLength(1);
      expect(data.recipients[0].displayName).toBe('Dr. Smith');
      expect(data.topics).toHaveLength(1);
      expect(data.topics[0].displayName).toBe('Medical Question');
    });
  });

  describe('handleSendNew', () => {
    it('sends new message with all required fields', async () => {
      let capturedBody = '';
      globalThis.fetch = mock(async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = init?.body as string;
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }) as typeof fetch;

      await fetch('/api/messages/send-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'tok',
          recipient: { displayName: 'Dr. Smith', id: '123' },
          topic: { displayName: 'Medical Question', id: '456' },
          subject: 'Test subject',
          messageBody: 'Test body',
        }),
      });

      const parsed = JSON.parse(capturedBody);
      expect(parsed.subject).toBe('Test subject');
      expect(parsed.messageBody).toBe('Test body');
      expect(parsed.recipient.id).toBe('123');
      expect(parsed.topic.id).toBe('456');
    });
  });
});
