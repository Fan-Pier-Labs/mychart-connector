/**
 * Header used to pass the browser-held Client Encryption Key (CEK) on
 * requests that touch MyChart credentials. The CEK is never persisted
 * server-side; it lives only in the user's localStorage + inside their
 * MCP URL. See `encryption.ts::encryptLayered` for how it's used.
 */
export const CLIENT_KEY_HEADER = 'x-client-key';

export function readClientKey(req: Request): string | null {
  const raw = req.headers.get(CLIENT_KEY_HEADER);
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}
