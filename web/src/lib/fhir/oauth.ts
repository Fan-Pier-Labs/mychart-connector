/**
 * SMART on FHIR OAuth 2.0 flow for Epic FHIR API connections.
 *
 * Implements:
 * - SMART configuration discovery
 * - Authorization URL construction
 * - Authorization code → token exchange
 * - Token refresh
 */

import { getEpicFhirClientId, getFhirRedirectUri, FHIR_SCOPES } from './config';
import { encrypt, decrypt } from '../mcp/encryption';

export interface SmartConfig {
  authorization_endpoint: string;
  token_endpoint: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  patient: string; // Epic includes the patient FHIR ID
  scope: string;
  token_type: string;
}

// Cache SMART configs per server URL
const smartConfigCache = new Map<string, { config: SmartConfig; fetchedAt: number }>();
const SMART_CONFIG_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Discover the SMART configuration for a FHIR server.
 * Fetches from `.well-known/smart-configuration`.
 */
export async function getSmartConfig(fhirBaseUrl: string): Promise<SmartConfig> {
  const cached = smartConfigCache.get(fhirBaseUrl);
  if (cached && Date.now() - cached.fetchedAt < SMART_CONFIG_TTL_MS) {
    return cached.config;
  }

  const url = `${fhirBaseUrl.replace(/\/$/, '')}/.well-known/smart-configuration`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch SMART configuration from ${url}: ${res.status}`);
  }

  const data = await res.json() as Record<string, unknown>;
  const config: SmartConfig = {
    authorization_endpoint: data.authorization_endpoint as string,
    token_endpoint: data.token_endpoint as string,
  };

  if (!config.authorization_endpoint || !config.token_endpoint) {
    throw new Error(`SMART configuration at ${url} is missing required endpoints`);
  }

  smartConfigCache.set(fhirBaseUrl, { config, fetchedAt: Date.now() });
  return config;
}

/**
 * Encode OAuth state parameter.
 * Encrypts user context into the state so we don't need a server-side state store.
 */
export async function encodeOAuthState(userId: string, fhirBaseUrl: string, organizationName: string): Promise<string> {
  const payload = JSON.stringify({
    userId,
    fhirBaseUrl,
    organizationName,
    nonce: crypto.randomUUID(),
    ts: Date.now(),
  });
  return encrypt(payload);
}

/**
 * Decode and validate OAuth state parameter.
 */
export async function decodeOAuthState(state: string): Promise<{
  userId: string;
  fhirBaseUrl: string;
  organizationName: string;
}> {
  const payload = await decrypt(state);
  const data = JSON.parse(payload);

  // Reject states older than 10 minutes
  const age = Date.now() - data.ts;
  if (age > 10 * 60 * 1000) {
    throw new Error('OAuth state has expired');
  }

  return {
    userId: data.userId,
    fhirBaseUrl: data.fhirBaseUrl,
    organizationName: data.organizationName,
  };
}

/**
 * Build the OAuth authorization URL for a FHIR server.
 */
export async function buildAuthorizationUrl(fhirBaseUrl: string, state: string): Promise<string> {
  const smartConfig = await getSmartConfig(fhirBaseUrl);
  const clientId = await getEpicFhirClientId();
  const redirectUri = getFhirRedirectUri();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: FHIR_SCOPES,
    state,
    aud: fhirBaseUrl,
  });

  return `${smartConfig.authorization_endpoint}?${params.toString()}`;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(fhirBaseUrl: string, code: string): Promise<TokenResponse> {
  const smartConfig = await getSmartConfig(fhirBaseUrl);
  const clientId = await getEpicFhirClientId();
  const redirectUri = getFhirRedirectUri();

  const res = await fetch(smartConfig.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<TokenResponse>;
}

/**
 * Refresh an expired access token using a refresh token.
 */
export async function refreshAccessToken(fhirBaseUrl: string, refreshToken: string): Promise<TokenResponse> {
  const smartConfig = await getSmartConfig(fhirBaseUrl);
  const clientId = await getEpicFhirClientId();

  const res = await fetch(smartConfig.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<TokenResponse>;
}
