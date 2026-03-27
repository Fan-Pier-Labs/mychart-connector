/**
 * FHIR R4 client for Epic API connections.
 * Makes authenticated requests to a FHIR server, with automatic token refresh.
 */

import { updateFhirTokens, getFhirConnection } from '../db';
import { refreshAccessToken } from './oauth';

export interface FhirBundle<T = FhirResource> {
  resourceType: 'Bundle';
  type: string;
  total?: number;
  entry?: Array<{ resource: T }>;
}

export interface FhirResource {
  resourceType: string;
  id?: string;
  [key: string]: unknown;
}

export class FhirClient {
  private accessToken: string;
  private refreshToken: string;
  private tokenExpiresAt: Date;

  constructor(
    private fhirBaseUrl: string,
    private patientId: string,
    private connectionId: string,
    private userId: string,
    tokens: { accessToken: string; refreshToken: string; tokenExpiresAt: Date }
  ) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.tokenExpiresAt = tokens.tokenExpiresAt;
  }

  /**
   * Get a valid access token, refreshing if needed.
   */
  private async getValidToken(): Promise<string> {
    // Refresh if expired or within 2 minutes of expiry
    const buffer = 2 * 60 * 1000;
    if (this.tokenExpiresAt.getTime() - Date.now() < buffer) {
      await this.doRefresh();
    }
    return this.accessToken;
  }

  private async doRefresh(): Promise<void> {
    const tokens = await refreshAccessToken(this.fhirBaseUrl, this.refreshToken);
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    this.tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Persist new tokens to DB
    await updateFhirTokens(
      this.connectionId,
      this.userId,
      this.accessToken,
      this.refreshToken,
      this.tokenExpiresAt
    );
  }

  /**
   * Make an authenticated FHIR request.
   */
  async request<T = FhirResource>(resourcePath: string): Promise<T> {
    const token = await this.getValidToken();
    const url = `${this.fhirBaseUrl.replace(/\/$/, '')}/${resourcePath}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/fhir+json',
      },
    });

    if (res.status === 401) {
      // Token may have been revoked server-side, try one refresh
      await this.doRefresh();
      const retryToken = this.accessToken;
      const retryRes = await fetch(url, {
        headers: {
          Authorization: `Bearer ${retryToken}`,
          Accept: 'application/fhir+json',
        },
      });
      if (!retryRes.ok) {
        throw new Error(`FHIR request failed after refresh (${retryRes.status}): ${await retryRes.text()}`);
      }
      return retryRes.json() as Promise<T>;
    }

    if (!res.ok) {
      throw new Error(`FHIR request failed (${res.status}): ${await res.text()}`);
    }

    return res.json() as Promise<T>;
  }

  /**
   * Fetch all entries from a FHIR Bundle, following pagination links.
   */
  async fetchBundle<T = FhirResource>(resourcePath: string): Promise<T[]> {
    const bundle = await this.request<FhirBundle<T>>(resourcePath);
    const entries: T[] = [];

    if (bundle.entry) {
      for (const e of bundle.entry) {
        entries.push(e.resource);
      }
    }

    return entries;
  }

  // ── Resource fetchers ──

  async getPatient(): Promise<FhirResource> {
    return this.request(`Patient/${this.patientId}`);
  }

  async getConditions(): Promise<FhirResource[]> {
    return this.fetchBundle(`Condition?patient=${this.patientId}&clinical-status=active`);
  }

  async getMedicationRequests(): Promise<FhirResource[]> {
    return this.fetchBundle(`MedicationRequest?patient=${this.patientId}&status=active`);
  }

  async getAllergyIntolerances(): Promise<FhirResource[]> {
    return this.fetchBundle(`AllergyIntolerance?patient=${this.patientId}`);
  }

  async getObservations(category: 'vital-signs' | 'laboratory'): Promise<FhirResource[]> {
    return this.fetchBundle(`Observation?patient=${this.patientId}&category=${category}&_sort=-date&_count=100`);
  }

  async getImmunizations(): Promise<FhirResource[]> {
    return this.fetchBundle(`Immunization?patient=${this.patientId}`);
  }

  async getEncounters(status?: 'planned' | 'finished'): Promise<FhirResource[]> {
    const statusParam = status ? `&status=${status}` : '';
    return this.fetchBundle(`Encounter?patient=${this.patientId}${statusParam}&_sort=-date&_count=50`);
  }

  async getCareTeams(): Promise<FhirResource[]> {
    return this.fetchBundle(`CareTeam?patient=${this.patientId}`);
  }

  async getDocumentReferences(): Promise<FhirResource[]> {
    return this.fetchBundle(`DocumentReference?patient=${this.patientId}&_sort=-date&_count=50`);
  }

  async getDiagnosticReports(category?: 'LAB' | 'imaging'): Promise<FhirResource[]> {
    const catParam = category ? `&category=${category}` : '';
    return this.fetchBundle(`DiagnosticReport?patient=${this.patientId}${catParam}&_sort=-date&_count=50`);
  }
}

/**
 * Create a FhirClient from a stored FHIR connection ID.
 */
export async function createFhirClientFromConnection(connectionId: string, userId: string): Promise<FhirClient | null> {
  const conn = await getFhirConnection(connectionId, userId);
  if (!conn) return null;

  return new FhirClient(
    conn.fhirServerUrl,
    conn.fhirPatientId,
    conn.id,
    conn.userId,
    {
      accessToken: conn.accessToken,
      refreshToken: conn.refreshToken,
      tokenExpiresAt: conn.tokenExpiresAt,
    }
  );
}
