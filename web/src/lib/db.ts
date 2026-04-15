import { Pool } from 'pg';
import { getPoolOptions } from './mcp/config';
import { encrypt, decrypt, encryptLayered, decryptLayered } from './mcp/encryption';

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
  passkeyCredential: string | null;
  mychartEmail: string | null;
  enabled: boolean;
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
  passkeyCredential?: string | null;
  mychartEmail?: string | null;
  enabled?: boolean;
}

async function encField(value: string, cekHex: string | null | undefined): Promise<string> {
  return cekHex ? encryptLayered(value, cekHex) : encrypt(value);
}

async function decField(value: string, cekHex: string | null | undefined, layered: boolean): Promise<string> {
  if (layered) {
    if (!cekHex) {
      throw new Error('Client encryption key required to decrypt credentials');
    }
    return decryptLayered(value, cekHex);
  }
  return decrypt(value);
}

async function rowToInstance(
  row: Record<string, unknown>,
  cekHex: string | null | undefined,
  clientEncryptionEnabled = false,
): Promise<MyChartInstance> {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    hostname: row.hostname as string,
    username: row.username as string,
    password: await decField(row.encrypted_password as string, cekHex, clientEncryptionEnabled),
    totpSecret: row.encrypted_totp_secret
      ? await decField(row.encrypted_totp_secret as string, cekHex, clientEncryptionEnabled)
      : null,
    passkeyCredential: row.encrypted_passkey_credential
      ? await decField(row.encrypted_passkey_credential as string, cekHex, clientEncryptionEnabled)
      : null,
    mychartEmail: row.mychart_email as string | null,
    enabled: row.enabled !== false,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
    notificationsLastCheckedAt: row.notifications_last_checked_at as Date | null,
  };
}

async function getUserEncryptionMode(userId: string): Promise<boolean> {
  const db = await getPool();
  const res = await db.query(
    'SELECT client_encryption_enabled FROM "user" WHERE id = $1',
    [userId],
  );
  if (res.rows.length === 0) return false;
  return res.rows[0].client_encryption_enabled === true;
}

export async function getUserClientEncryptionEnabled(userId: string): Promise<boolean> {
  return getUserEncryptionMode(userId);
}

export async function createMyChartInstance(
  userId: string,
  input: CreateMyChartInstanceInput,
  cekHex?: string | null,
): Promise<MyChartInstance> {
  const db = await getPool();
  let layered = await getUserEncryptionMode(userId);

  // Bootstrap: if the user is in single mode and has no existing credentials,
  // opt them into layered mode as long as the browser provided a CEK. This is
  // the path fresh users take the first time they save an instance — there's
  // nothing to rewrap, so it's a free upgrade.
  if (!layered && cekHex) {
    const existing = await db.query(
      'SELECT 1 FROM mychart_instances WHERE user_id = $1 LIMIT 1',
      [userId],
    );
    if (existing.rows.length === 0) {
      await db.query(
        'UPDATE "user" SET client_encryption_enabled = TRUE WHERE id = $1',
        [userId],
      );
      layered = true;
    }
  }

  if (layered && !cekHex) {
    throw new Error('Client encryption key required to save credentials');
  }
  const outerKey = layered ? cekHex ?? null : null;
  const encryptedPassword = await encField(input.password, outerKey);
  const encryptedTotp = input.totpSecret ? await encField(input.totpSecret, outerKey) : null;

  const result = await db.query(
    `INSERT INTO mychart_instances (user_id, hostname, username, encrypted_password, encrypted_totp_secret, mychart_email)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, input.hostname, input.username, encryptedPassword, encryptedTotp, input.mychartEmail ?? null]
  );

  return rowToInstance(result.rows[0], outerKey, layered);
}

export interface MyChartInstanceMetadata {
  id: string;
  userId: string;
  hostname: string;
  username: string;
  mychartEmail: string | null;
  hasTotpSecret: boolean;
  hasPasskeyCredential: boolean;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  notificationsLastCheckedAt: Date | null;
}

/**
 * Cheap metadata-only lookup that doesn't need the Client Encryption Key.
 * Safe to call from endpoints that only need to render an account list.
 */
export async function getMyChartInstancesMetadata(userId: string): Promise<MyChartInstanceMetadata[]> {
  const db = await getPool();
  const result = await db.query(
    `SELECT id, user_id, hostname, username, mychart_email, enabled,
            encrypted_totp_secret IS NOT NULL AS has_totp,
            encrypted_passkey_credential IS NOT NULL AS has_passkey,
            created_at, updated_at, notifications_last_checked_at
       FROM mychart_instances
      WHERE user_id = $1
      ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    hostname: row.hostname,
    username: row.username,
    mychartEmail: row.mychart_email,
    hasTotpSecret: row.has_totp === true,
    hasPasskeyCredential: row.has_passkey === true,
    enabled: row.enabled !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notificationsLastCheckedAt: row.notifications_last_checked_at,
  }));
}

export async function getMyChartInstances(userId: string, cekHex?: string | null): Promise<MyChartInstance[]> {
  const db = await getPool();
  const result = await db.query(
    `SELECT mi.*, u.client_encryption_enabled AS _layered
       FROM mychart_instances mi
       JOIN "user" u ON mi.user_id = u.id
      WHERE mi.user_id = $1
      ORDER BY mi.created_at DESC`,
    [userId]
  );
  return Promise.all(result.rows.map((row) => rowToInstance(row, cekHex ?? null, row._layered === true)));
}

export async function getMyChartInstance(
  id: string,
  userId: string,
  cekHex?: string | null,
): Promise<MyChartInstance | null> {
  const db = await getPool();
  const result = await db.query(
    `SELECT mi.*, u.client_encryption_enabled AS _layered
       FROM mychart_instances mi
       JOIN "user" u ON mi.user_id = u.id
      WHERE mi.id = $1 AND mi.user_id = $2`,
    [id, userId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return rowToInstance(row, cekHex ?? null, row._layered === true);
}

export async function updateMyChartInstance(
  id: string,
  userId: string,
  updates: UpdateMyChartInstanceInput,
  cekHex?: string | null,
): Promise<MyChartInstance | null> {
  const db = await getPool();
  const layered = await getUserEncryptionMode(userId);
  const touchesCredentials =
    updates.password !== undefined || updates.totpSecret || updates.passkeyCredential;
  if (layered && !cekHex && touchesCredentials) {
    throw new Error('Client encryption key required to update credentials');
  }
  const outerKey = layered ? cekHex ?? null : null;

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
    values.push(await encField(updates.password, outerKey));
  }
  if (updates.totpSecret !== undefined) {
    setClauses.push(`encrypted_totp_secret = $${paramIndex++}`);
    values.push(updates.totpSecret ? await encField(updates.totpSecret, outerKey) : null);
  }
  if (updates.passkeyCredential !== undefined) {
    setClauses.push(`encrypted_passkey_credential = $${paramIndex++}`);
    values.push(updates.passkeyCredential ? await encField(updates.passkeyCredential, outerKey) : null);
  }
  if (updates.mychartEmail !== undefined) {
    setClauses.push(`mychart_email = $${paramIndex++}`);
    values.push(updates.mychartEmail);
  }
  if (updates.enabled !== undefined) {
    setClauses.push(`enabled = $${paramIndex++}`);
    values.push(updates.enabled);
  }

  if (setClauses.length === 0) {
    return getMyChartInstance(id, userId, cekHex);
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id, userId);

  const result = await db.query(
    `UPDATE mychart_instances SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING *`,
    values
  );

  if (result.rows.length === 0) return null;
  return rowToInstance(result.rows[0], outerKey, layered);
}

export async function deleteMyChartInstance(id: string, userId: string): Promise<boolean> {
  const db = await getPool();
  const result = await db.query(
    'DELETE FROM mychart_instances WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

// ── Mode transitions ──
//
// When a user toggles notifications, we re-wrap every stored credential.
//   - 'single'  : currently layered. Strip the CEK layer so the server-side
//                 notification checker can decrypt with the env key alone.
//                 Sets client_encryption_enabled = FALSE.
//   - 'layered' : currently single. Wrap every credential with the CEK so the
//                 DB is no longer decryptable without the browser's key.
//                 Sets client_encryption_enabled = TRUE.
export async function rewrapUserCredentials(
  userId: string,
  cekHex: string,
  toMode: 'single' | 'layered',
): Promise<void> {
  const db = await getPool();
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const currentMode = await client.query(
      'SELECT client_encryption_enabled FROM "user" WHERE id = $1 FOR UPDATE',
      [userId],
    );
    const currentlyLayered = currentMode.rows[0]?.client_encryption_enabled === true;
    const targetLayered = toMode === 'layered';

    if (currentlyLayered === targetLayered) {
      await client.query('COMMIT');
      return;
    }

    const rows = await client.query(
      `SELECT id, encrypted_password, encrypted_totp_secret, encrypted_passkey_credential
         FROM mychart_instances WHERE user_id = $1`,
      [userId],
    );

    for (const row of rows.rows) {
      const rewrap = async (value: string | null): Promise<string | null> => {
        if (!value) return null;
        if (currentlyLayered) {
          const plain = await decryptLayered(value, cekHex);
          return encrypt(plain);
        }
        const plain = await decrypt(value);
        return encryptLayered(plain, cekHex);
      };

      const newPassword = await rewrap(row.encrypted_password);
      const newTotp = await rewrap(row.encrypted_totp_secret);
      const newPasskey = await rewrap(row.encrypted_passkey_credential);

      await client.query(
        `UPDATE mychart_instances
            SET encrypted_password = $1,
                encrypted_totp_secret = $2,
                encrypted_passkey_credential = $3,
                updated_at = NOW()
          WHERE id = $4`,
        [newPassword, newTotp, newPasskey, row.id],
      );
    }

    await client.query(
      'UPDATE "user" SET client_encryption_enabled = $1 WHERE id = $2',
      [targetLayered, userId],
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Notification helpers ──

export interface NotificationEnabledInstance extends MyChartInstance {
  userEmail: string;
  includeContent: boolean;
}

export async function getNotificationEnabledInstances(): Promise<NotificationEnabledInstance[]> {
  const db = await getPool();
  // Only users who have opted out of client-side encryption can participate in
  // notifications, because the server-side checker has no access to the CEK.
  const result = await db.query(
    `SELECT mi.*, u.email AS user_email, u.notifications_include_content
     FROM mychart_instances mi
     JOIN "user" u ON mi.user_id = u.id
     WHERE u.notifications_enabled = TRUE
       AND u.client_encryption_enabled = FALSE
       AND (mi.encrypted_totp_secret IS NOT NULL OR mi.encrypted_passkey_credential IS NOT NULL)
       AND mi.enabled = TRUE
     ORDER BY mi.created_at ASC`
  );
  const instances = await Promise.all(result.rows.map(async (row) => {
    const instance = await rowToInstance(row, null, false);
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
