import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase;

export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync("openrecord.db");

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'New Chat',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_calls TEXT,
      tool_results TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    );

    DROP TABLE IF EXISTS alerts;
    CREATE TABLE alerts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      cta_label TEXT NOT NULL,
      uses_ai INTEGER NOT NULL DEFAULT 0,
      action_kind TEXT NOT NULL,
      action_payload TEXT NOT NULL DEFAULT '{}',
      dedup_key TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      dismissed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS memory_summary (
      account_id TEXT PRIMARY KEY,
      summary_md TEXT NOT NULL,
      facts_json TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      generator_model TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS insights (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body_md TEXT NOT NULL,
      severity TEXT NOT NULL,
      suggested_question TEXT,
      source_refs TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memory_sync_state (
      account_id TEXT NOT NULL,
      category TEXT NOT NULL,
      last_seen_at TEXT,
      last_synced_at TEXT NOT NULL,
      PRIMARY KEY (account_id, category)
    );
  `);

}

function getDb(): SQLite.SQLiteDatabase {
  if (!db) throw new Error("Database not initialized. Call initDatabase() first.");
  return db;
}

// ─── Chats ───

export type Chat = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export async function createChat(title = "New Chat"): Promise<Chat> {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const now = new Date().toISOString();
  await getDb().runAsync(
    "INSERT INTO chats (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
    id, title, now, now
  );
  return { id, title, created_at: now, updated_at: now };
}

export async function getChats(): Promise<Chat[]> {
  return getDb().getAllAsync<Chat>("SELECT * FROM chats ORDER BY updated_at DESC");
}

export async function getChat(id: string): Promise<Chat | null> {
  return getDb().getFirstAsync<Chat>("SELECT * FROM chats WHERE id = ?", id);
}

export async function updateChatTitle(id: string, title: string): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync(
    "UPDATE chats SET title = ?, updated_at = ? WHERE id = ?",
    title, now, id
  );
}

export async function deleteChat(id: string): Promise<void> {
  await getDb().runAsync("DELETE FROM messages WHERE chat_id = ?", id);
  await getDb().runAsync("DELETE FROM chats WHERE id = ?", id);
}

export async function touchChat(id: string): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync("UPDATE chats SET updated_at = ? WHERE id = ?", now, id);
}

// ─── Messages ───

export type Message = {
  id: string;
  chat_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls: string | null;
  tool_results: string | null;
  created_at: string;
};

export async function addMessage(
  chatId: string,
  role: Message["role"],
  content: string,
  toolCalls?: string,
  toolResults?: string,
): Promise<Message> {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const now = new Date().toISOString();
  await getDb().runAsync(
    "INSERT INTO messages (id, chat_id, role, content, tool_calls, tool_results, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    id, chatId, role, content, toolCalls ?? null, toolResults ?? null, now
  );
  await touchChat(chatId);
  return { id, chat_id: chatId, role, content, tool_calls: toolCalls ?? null, tool_results: toolResults ?? null, created_at: now };
}

export async function getMessages(chatId: string): Promise<Message[]> {
  return getDb().getAllAsync<Message>(
    "SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC",
    chatId
  );
}

// ─── Alerts ───

export type AlertType = "bill" | "refill" | "message" | "lab" | "appointment";
export type AlertActionKind = "open_url" | "request_refill" | "ai_chat";

export type Alert = {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  metadata: string;
  cta_label: string;
  uses_ai: number;
  action_kind: AlertActionKind;
  action_payload: string;
  dedup_key: string;
  created_at: string;
  dismissed_at: string | null;
};

export type AlertInput = {
  type: AlertType;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
  cta_label: string;
  uses_ai: boolean;
  action_kind: AlertActionKind;
  action_payload: Record<string, unknown>;
  dedup_key: string;
};

export async function getActiveAlerts(): Promise<Alert[]> {
  return getDb().getAllAsync<Alert>(
    "SELECT * FROM alerts WHERE dismissed_at IS NULL ORDER BY created_at DESC"
  );
}

export async function dismissAlert(id: string): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync(
    "UPDATE alerts SET dismissed_at = ? WHERE id = ?",
    now, id
  );
}

export async function upsertAlerts(inputs: AlertInput[]): Promise<{
  added: number;
  skipped: number;
}> {
  let added = 0;
  let skipped = 0;
  for (const a of inputs) {
    const existing = await getDb().getFirstAsync<{ id: string }>(
      "SELECT id FROM alerts WHERE dedup_key = ?",
      a.dedup_key,
    );
    if (existing) {
      skipped += 1;
      continue;
    }
    const id = `alert_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    await getDb().runAsync(
      `INSERT INTO alerts (id, type, title, description, metadata, cta_label, uses_ai, action_kind, action_payload, dedup_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      a.type,
      a.title,
      a.description,
      JSON.stringify(a.metadata),
      a.cta_label,
      a.uses_ai ? 1 : 0,
      a.action_kind,
      JSON.stringify(a.action_payload),
      a.dedup_key,
    );
    added += 1;
  }
  return { added, skipped };
}

export async function searchChats(query: string): Promise<Chat[]> {
  const pattern = `%${query}%`;
  return getDb().getAllAsync<Chat>(
    `SELECT DISTINCT c.* FROM chats c
     LEFT JOIN messages m ON c.id = m.chat_id
     WHERE c.title LIKE ? OR m.content LIKE ?
     ORDER BY c.updated_at DESC`,
    pattern, pattern
  );
}

// ─── Memory Summary ───

export type MemorySummaryRow = {
  account_id: string;
  summary_md: string;
  facts_json: string;
  generated_at: string;
  generator_model: string;
};

export async function getMemorySummary(accountId: string): Promise<MemorySummaryRow | null> {
  return getDb().getFirstAsync<MemorySummaryRow>(
    "SELECT * FROM memory_summary WHERE account_id = ?",
    accountId,
  );
}

export async function setMemorySummary(row: MemorySummaryRow): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO memory_summary (account_id, summary_md, facts_json, generated_at, generator_model)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(account_id) DO UPDATE SET
       summary_md = excluded.summary_md,
       facts_json = excluded.facts_json,
       generated_at = excluded.generated_at,
       generator_model = excluded.generator_model`,
    row.account_id, row.summary_md, row.facts_json, row.generated_at, row.generator_model,
  );
}

export async function deleteMemoryForAccount(accountId: string): Promise<void> {
  await getDb().runAsync("DELETE FROM memory_summary WHERE account_id = ?", accountId);
  await getDb().runAsync("DELETE FROM insights WHERE account_id = ?", accountId);
  await getDb().runAsync("DELETE FROM memory_sync_state WHERE account_id = ?", accountId);
}

// ─── Insights ───

export type InsightRow = {
  id: string;
  account_id: string;
  title: string;
  body_md: string;
  severity: "info" | "discuss" | "discuss_soon";
  suggested_question: string | null;
  source_refs: string | null;
  status: "active" | "dismissed" | "snoozed";
  created_at: string;
  updated_at: string;
};

export async function listInsights(
  accountId: string,
  status: InsightRow["status"] | "all" = "active",
): Promise<InsightRow[]> {
  if (status === "all") {
    return getDb().getAllAsync<InsightRow>(
      "SELECT * FROM insights WHERE account_id = ? ORDER BY created_at DESC",
      accountId,
    );
  }
  return getDb().getAllAsync<InsightRow>(
    "SELECT * FROM insights WHERE account_id = ? AND status = ? ORDER BY created_at DESC",
    accountId, status,
  );
}

export type InsightInput = {
  title: string;
  body_md: string;
  severity: InsightRow["severity"];
  suggested_question?: string | null;
  source_refs?: string | null;
};

export async function upsertInsightsForAccount(
  accountId: string,
  insights: InsightInput[],
): Promise<void> {
  // Title-based dedupe: if an insight with the same title exists for this
  // account, update it (and reactivate if dismissed). Otherwise insert.
  const now = new Date().toISOString();
  for (const ins of insights) {
    const existing = await getDb().getFirstAsync<InsightRow>(
      "SELECT * FROM insights WHERE account_id = ? AND title = ? LIMIT 1",
      accountId, ins.title,
    );
    if (existing) {
      await getDb().runAsync(
        `UPDATE insights SET body_md = ?, severity = ?, suggested_question = ?, source_refs = ?, status = 'active', updated_at = ?
         WHERE id = ?`,
        ins.body_md, ins.severity, ins.suggested_question ?? null, ins.source_refs ?? null, now, existing.id,
      );
    } else {
      const id = `ins_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      await getDb().runAsync(
        `INSERT INTO insights (id, account_id, title, body_md, severity, suggested_question, source_refs, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
        id, accountId, ins.title, ins.body_md, ins.severity, ins.suggested_question ?? null, ins.source_refs ?? null, now, now,
      );
    }
  }
}

export async function setInsightStatus(
  insightId: string,
  status: InsightRow["status"],
): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync(
    "UPDATE insights SET status = ?, updated_at = ? WHERE id = ?",
    status, now, insightId,
  );
}

// ─── Memory Sync State ───

export type SyncStateRow = {
  account_id: string;
  category: string;
  last_seen_at: string | null;
  last_synced_at: string;
};

export async function getSyncState(
  accountId: string,
  category: string,
): Promise<SyncStateRow | null> {
  return getDb().getFirstAsync<SyncStateRow>(
    "SELECT * FROM memory_sync_state WHERE account_id = ? AND category = ?",
    accountId, category,
  );
}

export async function getAllSyncStates(accountId: string): Promise<SyncStateRow[]> {
  return getDb().getAllAsync<SyncStateRow>(
    "SELECT * FROM memory_sync_state WHERE account_id = ?",
    accountId,
  );
}

export async function setSyncState(
  accountId: string,
  category: string,
  lastSeenAt: string | null,
): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync(
    `INSERT INTO memory_sync_state (account_id, category, last_seen_at, last_synced_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(account_id, category) DO UPDATE SET
       last_seen_at = excluded.last_seen_at,
       last_synced_at = excluded.last_synced_at`,
    accountId, category, lastSeenAt, now,
  );
}
