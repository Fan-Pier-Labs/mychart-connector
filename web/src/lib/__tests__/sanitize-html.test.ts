import { describe, it, expect, mock, beforeEach } from 'bun:test';

// Mock dompurify since it requires a DOM
const mockSanitize = mock((html: string) => html);
const mockAddHook = mock(() => {});
const mockRemoveHook = mock(() => {});

mock.module('dompurify', () => ({
  default: {
    sanitize: mockSanitize,
    addHook: mockAddHook,
    removeHook: mockRemoveHook,
  },
}));

const { sanitizeHtml } = await import('../sanitize-html');

describe('sanitizeHtml', () => {
  beforeEach(() => {
    mockSanitize.mockClear();
    mockAddHook.mockClear();
    mockRemoveHook.mockClear();
  });

  it('returns empty string for falsy input', () => {
    expect(sanitizeHtml('', 'tok')).toBe('');
    expect(sanitizeHtml(null as unknown as string, 'tok')).toBe('');
    expect(sanitizeHtml(undefined as unknown as string, 'tok')).toBe('');
  });

  it('calls DOMPurify.sanitize with allowed tags and attributes', () => {
    sanitizeHtml('<b>hello</b>', 'tok');
    expect(mockSanitize).toHaveBeenCalledTimes(1);
    const [, opts] = mockSanitize.mock.calls[0];
    expect(opts.ALLOWED_TAGS).toContain('b');
    expect(opts.ALLOWED_TAGS).toContain('img');
    expect(opts.ALLOWED_TAGS).toContain('a');
    expect(opts.ALLOWED_TAGS).not.toContain('script');
    expect(opts.ALLOWED_TAGS).not.toContain('iframe');
    expect(opts.ALLOWED_ATTR).toContain('src');
    expect(opts.ALLOWED_ATTR).toContain('href');
    expect(opts.ALLOWED_ATTR).not.toContain('onclick');
  });

  it('adds afterSanitizeAttributes hook before sanitizing', () => {
    sanitizeHtml('<p>test</p>', 'tok');
    expect(mockAddHook).toHaveBeenCalledWith('afterSanitizeAttributes', expect.any(Function));
  });

  it('removes hook after sanitizing', () => {
    sanitizeHtml('<p>test</p>', 'tok');
    expect(mockRemoveHook).toHaveBeenCalledWith('afterSanitizeAttributes');
  });

  describe('afterSanitizeAttributes hook', () => {
    function getHook(): (node: Partial<Element>) => void {
      sanitizeHtml('<p>test</p>', 'my-token');
      return mockAddHook.mock.calls[0][1] as (node: Partial<Element>) => void;
    }

    it('rewrites relative img src to proxy URL', () => {
      const hook = getHook();
      const attrs: Record<string, string> = { src: '/UCSFMyChart/Image/Load?fileName=abc' };
      const node = {
        tagName: 'IMG',
        getAttribute: (name: string) => attrs[name],
        setAttribute: (name: string, value: string) => { attrs[name] = value; },
      };
      hook(node as unknown as Element);
      expect(attrs.src).toContain('/api/mychart-image?token=my-token&path=');
      expect(attrs.src).toContain(encodeURIComponent('/UCSFMyChart/Image/Load?fileName=abc'));
    });

    it('leaves data: URLs untouched', () => {
      const hook = getHook();
      const attrs: Record<string, string> = { src: 'data:image/png;base64,abc' };
      const node = {
        tagName: 'IMG',
        getAttribute: (name: string) => attrs[name],
        setAttribute: (name: string, value: string) => { attrs[name] = value; },
      };
      hook(node as unknown as Element);
      expect(attrs.src).toBe('data:image/png;base64,abc');
    });

    it('leaves absolute http URLs untouched', () => {
      const hook = getHook();
      const attrs: Record<string, string> = { src: 'https://example.com/img.png' };
      const node = {
        tagName: 'IMG',
        getAttribute: (name: string) => attrs[name],
        setAttribute: (name: string, value: string) => { attrs[name] = value; },
      };
      hook(node as unknown as Element);
      expect(attrs.src).toBe('https://example.com/img.png');
    });

    it('forces target=_blank and rel=noopener noreferrer on links', () => {
      const hook = getHook();
      const attrs: Record<string, string> = {};
      const node = {
        tagName: 'A',
        getAttribute: (name: string) => attrs[name],
        setAttribute: (name: string, value: string) => { attrs[name] = value; },
      };
      hook(node as unknown as Element);
      expect(attrs.target).toBe('_blank');
      expect(attrs.rel).toBe('noopener noreferrer');
    });
  });
});
