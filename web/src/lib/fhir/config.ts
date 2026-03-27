/**
 * FHIR app configuration.
 * Reads Epic FHIR client credentials from env vars (Railway/self-hosted)
 * or AWS Secrets Manager (Fargate).
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const EPIC_FHIR_SECRET_ARN = 'arn:aws:secretsmanager:us-east-2:555985150976:secret:EPIC_FHIR_CLIENT_ID-CiA1Yi';
const AWS_REGION = 'us-east-2';

function isEnvVarMode(): boolean {
  return !!process.env.DATABASE_URL;
}

let _smClient: SecretsManagerClient | null = null;
function getSmClient(): SecretsManagerClient {
  if (!_smClient) {
    _smClient = new SecretsManagerClient({
      region: AWS_REGION,
      ...(process.env.NODE_ENV === 'development' ? { profile: 'fanpierlabs' } : {}),
    });
  }
  return _smClient;
}

/**
 * Returns true if Epic FHIR credentials are configured.
 */
export function hasFhirConfig(): boolean {
  if (isEnvVarMode()) {
    return !!process.env.EPIC_FHIR_CLIENT_ID;
  }
  // In AWS mode, always available from Secrets Manager
  return true;
}

let cachedClientId: string | null = null;

/**
 * Get the Epic FHIR app client_id.
 * In env-var mode, reads from EPIC_FHIR_CLIENT_ID.
 * In AWS mode, reads from Secrets Manager (uses non_production for sandbox, production for prod).
 */
export async function getEpicFhirClientId(): Promise<string> {
  if (cachedClientId) return cachedClientId;

  const fromEnv = process.env.EPIC_FHIR_CLIENT_ID;
  if (fromEnv) {
    cachedClientId = fromEnv;
    return cachedClientId;
  }

  if (!isEnvVarMode()) {
    // Load from AWS Secrets Manager
    const resp = await getSmClient().send(new GetSecretValueCommand({ SecretId: EPIC_FHIR_SECRET_ARN }));
    if (resp.SecretString) {
      const parsed = JSON.parse(resp.SecretString);
      // Use non_production for sandbox/dev, production when ready
      cachedClientId = parsed.non_production || parsed.production;
      return cachedClientId!;
    }
  }

  throw new Error('EPIC_FHIR_CLIENT_ID is not configured. Set it as an environment variable or add to Secrets Manager.');
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
