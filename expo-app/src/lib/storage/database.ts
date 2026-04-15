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
