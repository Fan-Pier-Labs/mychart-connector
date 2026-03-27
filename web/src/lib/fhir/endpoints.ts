/**
 * Epic FHIR endpoint discovery.
 * Fetches and caches Epic's public endpoint directory so users can
 * search for their healthcare organization by name.
 */

export interface EpicEndpoint {
  name: string;
  fhirBaseUrl: string;
}

// Epic publishes their endpoint list at this URL
const EPIC_ENDPOINT_BUNDLE_URL = 'https://open.epic.com/MyApps/EndpointsJson';

let cachedEndpoints: EpicEndpoint[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch the full Epic endpoint directory.
 * Results are cached in memory for 24 hours.
 */
async function fetchEndpoints(): Promise<EpicEndpoint[]> {
  const now = Date.now();
  if (cachedEndpoints && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedEndpoints;
  }

  const res = await fetch(EPIC_ENDPOINT_BUNDLE_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Epic endpoints: ${res.status} ${res.statusText}`);
  }

  const data = await res.json() as { Entries?: Array<{ OrganizationName?: string; FHIRPatientFacingURI?: string }> };
  const entries = data.Entries ?? [];

  cachedEndpoints = entries
    .filter((e) => e.OrganizationName && e.FHIRPatientFacingURI)
    .map((e) => ({
      name: e.OrganizationName!,
      // Upgrade DSTU2/STU3 URLs to R4 — Epic endpoints follow a consistent pattern
      fhirBaseUrl: e.FHIRPatientFacingURI!
        .replace(/\/FHIR\/DSTU2\/?$/, '/FHIR/R4/')
        .replace(/\/FHIR\/STU3\/?$/, '/FHIR/R4/'),
    }));
  cacheTimestamp = now;

  return cachedEndpoints;
}

/**
 * Search for Epic FHIR endpoints by organization name.
 * Case-insensitive substring match, returns top 20 results.
 */
export async function searchEpicEndpoints(query: string): Promise<EpicEndpoint[]> {
  const endpoints = await fetchEndpoints();
  const q = query.toLowerCase().trim();
  if (!q) return [];

  return endpoints
    .filter((e) => e.name.toLowerCase().includes(q))
    .slice(0, 20);
}
