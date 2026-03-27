import { Pool } from 'pg';
import { getPoolOptions } from './mcp/config';
import { encrypt, decrypt } from './mcp/encryption';

let pool: Pool | null = null;

async function getPool(): Promise<Pool> {
  if (pool) return pool;
  const opts = await getPoolOptions();
  pool = new Pool(opts);
  return pool;
}

export interface MyChartInstance {
  id: string;
  userId: string;
  hostname: string;
  username: string;
  password: string;
  totpSecret: string | null;
  mychartEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
  notificationsLastCheckedAt: Date | null;
}

export interface CreateMyChartInstanceInput {
  hostname: string;
  username: string;
  password: string;
  totpSecret?: string;
  mychartEmail?: string;
}

export interface UpdateMyChartInstanceInput {
  hostname?: string;
  username?: string;
  password?: string;
  totpSecret?: string | null;
  mychartEmail?: string | null;
}

async function rowToInstance(row: Record<string, unknown>): Promise<MyChartInstance> {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    hostname: row.hostname as string,
    username: row.username as string,
    password: await decrypt(row.encrypted_password as string),
    totpSecret: row.encrypted_totp_secret ? await decrypt(row.encrypted_totp_secret as string) : null,
    mychartEmail: row.mychart_email as string | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
    notificationsLastCheckedAt: row.notifications_last_checked_at as Date | null,
  };
}

export async function createMyChartInstance(userId: string, input: CreateMyChartInstanceInput): Promise<MyChartInstance> {
  const db = await getPool();
  const encryptedPassword = await encrypt(input.password);
  const encryptedTotp = input.totpSecret ? await encrypt(input.totpSecret) : null;

  const result = await db.query(
    `INSERT INTO mychart_instances (user_id, hostname, username, encrypted_password, encrypted_totp_secret, mychart_email)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, input.hostname, input.username, encryptedPassword, encryptedTotp, input.mychartEmail ?? null]
  );

  return rowToInstance(result.rows[0]);
}

export async function getMyChartInstances(userId: string): Promise<MyChartInstance[]> {
  const db = await getPool();
  const result = await db.query(
    'SELECT * FROM mychart_instances WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return Promise.all(result.rows.map(rowToInstance));
}

export async function getMyChartInstance(id: string, userId: string): Promise<MyChartInstance | null> {
  const db = await getPool();
  const result = await db.query(
    'SELECT * FROM mychart_instances WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  if (result.rows.length === 0) return null;
  return rowToInstance(result.rows[0]);
}

export async function updateMyChartInstance(id: string, userId: string, updates: UpdateMyChartInstanceInput): Promise<MyChartInstance | null> {
  const db = await getPool();

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.hostname !== undefined) {
    setClauses.push(`hostname = $${paramIndex++}`);
    values.push(updates.hostname);
  }
  if (updates.username !== undefined) {
    setClauses.push(`username = $${paramIndex++}`);
    values.push(updates.username);
  }
  if (updates.password !== undefined) {
    setClauses.push(`encrypted_password = $${paramIndex++}`);
    values.push(await encrypt(updates.password));
  }
  if (updates.totpSecret !== undefined) {
    setClauses.push(`encrypted_totp_secret = $${paramIndex++}`);
    values.push(updates.totpSecret ? await encrypt(updates.totpSecret) : null);
  }
  if (updates.mychartEmail !== undefined) {
    setClauses.push(`mychart_email = $${paramIndex++}`);
    values.push(updates.mychartEmail);
  }

  if (setClauses.length === 0) {
    return getMyChartInstance(id, userId);
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id, userId);

  const result = await db.query(
    `UPDATE mychart_instances SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING *`,
    values
  );

  if (result.rows.length === 0) return null;
  return rowToInstance(result.rows[0]);
}

export async function deleteMyChartInstance(id: string, userId: string): Promise<boolean> {
  const db = await getPool();
  const result = await db.query(
    'DELETE FROM mychart_instances WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

// ── FHIR Connections ──

export interface FhirConnection {
  id: string;
  userId: string;
  fhirServerUrl: string;
  organizationName: string;
  fhirPatientId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  scopes: string | null;
  createdAt: Date;
  updatedAt: Date;
  notificationsLastCheckedAt: Date | null;
}

export interface CreateFhirConnectionInput {
  fhirServerUrl: string;
  organizationName: string;
  patientId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes?: string;
}

async function rowToFhirConnection(row: Record<string, unknown>): Promise<FhirConnection> {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    fhirServerUrl: row.fhir_server_url as string,
    organizationName: row.organization_name as string,
    fhirPatientId: row.fhir_patient_id as string,
    accessToken: await decrypt(row.encrypted_access_token as string),
    refreshToken: await decrypt(row.encrypted_refresh_token as string),
    tokenExpiresAt: row.token_expires_at as Date,
    scopes: row.scopes as string | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
    notificationsLastCheckedAt: row.notifications_last_checked_at as Date | null,
  };
}

export async function createFhirConnection(userId: string, input: CreateFhirConnectionInput): Promise<FhirConnection> {
  const db = await getPool();
  const encryptedAccessToken = await encrypt(input.accessToken);
  const encryptedRefreshToken = await encrypt(input.refreshToken);

  const result = await db.query(
    `INSERT INTO fhir_connections (user_id, fhir_server_url, organization_name, fhir_patient_id, encrypted_access_token, encrypted_refresh_token, token_expires_at, scopes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [userId, input.fhirServerUrl, input.organizationName, input.patientId, encryptedAccessToken, encryptedRefreshToken, input.expiresAt, input.scopes ?? null]
  );

  return rowToFhirConnection(result.rows[0]);
}

export async function getFhirConnections(userId: string): Promise<FhirConnection[]> {
  const db = await getPool();
  const result = await db.query(
    'SELECT * FROM fhir_connections WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return Promise.all(result.rows.map(rowToFhirConnection));
}

export async function getFhirConnection(id: string, userId: string): Promise<FhirConnection | null> {
  const db = await getPool();
  const result = await db.query(
    'SELECT * FROM fhir_connections WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  if (result.rows.length === 0) return null;
  return rowToFhirConnection(result.rows[0]);
}

export async function updateFhirTokens(
  id: string,
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date
): Promise<FhirConnection | null> {
  const db = await getPool();
  const encryptedAccessToken = await encrypt(accessToken);
  const encryptedRefreshToken = await encrypt(refreshToken);

  const result = await db.query(
    `UPDATE fhir_connections
     SET encrypted_access_token = $1, encrypted_refresh_token = $2, token_expires_at = $3, updated_at = NOW()
     WHERE id = $4 AND user_id = $5
     RETURNING *`,
    [encryptedAccessToken, encryptedRefreshToken, expiresAt, id, userId]
  );

  if (result.rows.length === 0) return null;
  return rowToFhirConnection(result.rows[0]);
}

export async function deleteFhirConnection(id: string, userId: string): Promise<boolean> {
  const db = await getPool();
  const result = await db.query(
    'DELETE FROM fhir_connections WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

// ── FHIR Notification helpers ──

export interface NotificationEnabledFhirConnection extends FhirConnection {
  userEmail: string;
  includeContent: boolean;
}

export async function getNotificationEnabledFhirConnections(): Promise<NotificationEnabledFhirConnection[]> {
  const db = await getPool();
  const result = await db.query(
    `SELECT fc.*, u.email AS user_email, u.notifications_include_content
     FROM fhir_connections fc
     JOIN "user" u ON fc.user_id = u.id
     WHERE u.notifications_enabled = TRUE
     ORDER BY fc.created_at ASC`
  );
  const connections = await Promise.all(result.rows.map(async (row) => {
    const connection = await rowToFhirConnection(row);
    return {
      ...connection,
      userEmail: row.user_email as string,
      includeContent: row.notifications_include_content as boolean,
    };
  }));
  return connections;
}

export async function updateFhirNotificationLastChecked(connectionId: string, userId: string): Promise<void> {
  const db = await getPool();
  await db.query(
    `UPDATE fhir_connections SET notifications_last_checked_at = NOW() WHERE id = $1 AND user_id = $2`,
    [connectionId, userId]
  );
}

// ── Notification helpers ──

export interface NotificationEnabledInstance extends MyChartInstance {
  userEmail: string;
  includeContent: boolean;
}

export async function getNotificationEnabledInstances(): Promise<NotificationEnabledInstance[]> {
  const db = await getPool();
  const result = await db.query(
    `SELECT mi.*, u.email AS user_email, u.notifications_include_content
     FROM mychart_instances mi
     JOIN "user" u ON mi.user_id = u.id
     WHERE u.notifications_enabled = TRUE
       AND mi.encrypted_totp_secret IS NOT NULL
     ORDER BY mi.created_at ASC`
  );
  const instances = await Promise.all(result.rows.map(async (row) => {
    const instance = await rowToInstance(row);
    return {
      ...instance,
      userEmail: row.user_email as string,
      includeContent: row.notifications_include_content as boolean,
    };
  }));
  return instances;
}

export async function updateNotificationLastChecked(instanceId: string, userId: string): Promise<void> {
  const db = await getPool();
  await db.query(
    `UPDATE mychart_instances SET notifications_last_checked_at = NOW() WHERE id = $1 AND user_id = $2`,
    [instanceId, userId]
  );
}

export interface NotificationPreferences {
  enabled: boolean;
  includeContent: boolean;
}

export async function getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const db = await getPool();
  const result = await db.query(
    `SELECT notifications_enabled, notifications_include_content FROM "user" WHERE id = $1`,
    [userId]
  );
  if (result.rows.length === 0) {
    return { enabled: false, includeContent: false };
  }
  const row = result.rows[0];
  return {
    enabled: row.notifications_enabled ?? false,
    includeContent: row.notifications_include_content ?? false,
  };
}

export async function setUserNotificationPreferences(
  userId: string,
  prefs: NotificationPreferences
): Promise<void> {
  const db = await getPool();
  await db.query(
    `UPDATE "user" SET notifications_enabled = $1, notifications_include_content = $2 WHERE id = $3`,
    [prefs.enabled, prefs.includeContent, userId]
  );
}
