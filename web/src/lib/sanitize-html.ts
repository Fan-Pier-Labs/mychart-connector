import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'b', 'i', 'em', 'strong', 'u', 'br', 'p', 'div', 'span',
  'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
  'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'hr', 'pre', 'code', 'sub', 'sup',
];

const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'class', 'style',
  'width', 'height', 'target', 'rel', 'colspan', 'rowspan',
];

/**
 * Sanitize HTML from external sources (MyChart API responses, scraped content).
 * - Strips dangerous tags (script, iframe, object, embed, etc.)
 * - Strips event handler attributes (onclick, onerror, etc.)
 * - Rewrites relative <img src> URLs to go through our image proxy
 * - Forces target="_blank" and rel="noopener noreferrer" on <a> tags
 */
export function sanitizeHtml(html: string, token: string): string {
  if (!html) return '';

  // Add hook to rewrite img src URLs and secure links
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Rewrite relative image URLs to our proxy
    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src');
      if (src && !src.startsWith('data:') && !src.startsWith('http://') && !src.startsWith('https://')) {
        // Relative MyChart URL like /UCSFMyChart/Image/Load?fileName=...
        const proxyUrl = `/api/mychart-image?token=${encodeURIComponent(token)}&path=${encodeURIComponent(src)}`;
        node.setAttribute('src', proxyUrl);
      }
    }

    // Force secure link behavior
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });

  // Remove hook to avoid affecting other DOMPurify calls
  DOMPurify.removeHook('afterSanitizeAttributes');

  return clean;
}
