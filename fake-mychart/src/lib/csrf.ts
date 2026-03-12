import { v4 as uuidv4 } from 'uuid';

// Generate a fake CSRF token. We don't actually validate them — just need to return one
// so scrapers can include it in subsequent requests.
export function generateCsrfToken(): string {
  return 'fake-csrf-token-' + uuidv4().replace(/-/g, '');
}
