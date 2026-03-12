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
