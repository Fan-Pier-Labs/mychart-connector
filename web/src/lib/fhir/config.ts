/**
 * FHIR app configuration.
 * Reads Epic FHIR client credentials from env vars (Railway/self-hosted)
 * or AWS Secrets Manager (Fargate).
 */

function isEnvVarMode(): boolean {
  return !!process.env.DATABASE_URL;
}

/**
 * Returns true if Epic FHIR credentials are configured.
 */
export function hasFhirConfig(): boolean {
  if (isEnvVarMode()) {
    return !!process.env.EPIC_FHIR_CLIENT_ID;
  }
  // In AWS mode, we'll always have it once the secret is created
  return !!process.env.EPIC_FHIR_CLIENT_ID;
}

let cachedClientId: string | null = null;

/**
 * Get the Epic FHIR app client_id.
 */
export async function getEpicFhirClientId(): Promise<string> {
  if (cachedClientId) return cachedClientId;

  const fromEnv = process.env.EPIC_FHIR_CLIENT_ID;
  if (fromEnv) {
    cachedClientId = fromEnv;
    return cachedClientId;
  }

  throw new Error('EPIC_FHIR_CLIENT_ID is not configured. Set it as an environment variable.');
}

/**
 * Get the OAuth redirect URI for the FHIR callback.
 */
export function getFhirRedirectUri(): string {
  if (process.env.EPIC_FHIR_REDIRECT_URI) {
    return process.env.EPIC_FHIR_REDIRECT_URI;
  }
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/api/fhir/callback`;
}

/**
 * Default FHIR scopes to request during authorization.
 */
export const FHIR_SCOPES = [
  'openid',
  'fhirUser',
  'launch/patient',
  'patient/Patient.read',
  'patient/Condition.read',
  'patient/MedicationRequest.read',
  'patient/AllergyIntolerance.read',
  'patient/Observation.read',
  'patient/Immunization.read',
  'patient/Encounter.read',
  'patient/CareTeam.read',
  'patient/DocumentReference.read',
  'patient/DiagnosticReport.read',
].join(' ');
