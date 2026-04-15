"use client";

// Browser-held Client Encryption Key (CEK). Lives only in localStorage and
// in the MCP URL. Never crosses the wire during its lifetime — the server
// only sees it when the browser explicitly attaches it via the
// `x-client-key` header (or when it arrives in the MCP URL).

const STORAGE_KEY = 'openrecord_cek';
export const CLIENT_KEY_HEADER = 'x-client-key';

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

function isValidCek(hex: string): boolean {
  return /^[0-9a-f]{64}$/.test(hex);
}

export function getCek(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  return isValidCek(normalized) ? normalized : null;
}

export function getOrCreateCek(): string {
  const existing = getCek();
  if (existing) return existing;
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = toHex(bytes);
  window.localStorage.setItem(STORAGE_KEY, hex);
  return hex;
}

export function importCek(hex: string): void {
  const normalized = hex.trim().toLowerCase();
  if (!isValidCek(normalized)) {
    throw new Error('Recovery key must be 64 hex characters');
  }
  window.localStorage.setItem(STORAGE_KEY, normalized);
}

export function exportCek(): string | null {
  return getCek();
}

export function clearCek(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// Fetch wrapper that attaches the CEK via `x-client-key` if present. Body
// is stringified as JSON when provided.
export async function fetchWithCek(url: string, init: RequestInit = {}): Promise<Response> {
  const cek = getCek();
  const headers = new Headers(init.headers);
  if (cek) headers.set(CLIENT_KEY_HEADER, cek);
  return fetch(url, { ...init, headers });
}

export async function postWithCek(url: string, body: unknown, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  return fetchWithCek(url, {
    method: init.method ?? 'POST',
    ...init,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
