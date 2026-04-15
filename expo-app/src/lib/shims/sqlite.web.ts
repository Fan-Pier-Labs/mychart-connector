/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Web shim for expo-sqlite — uses in-memory storage backed by localStorage.
 * Implements just enough of the SQLiteDatabase API to support our usage.
 */

type Row = Record<string, unknown>;

// Simple in-memory table storage backed by localStorage
const tables: Record<string, Row[]> = {};

function loadTable(name: string): Row[] {
  if (!tables[name]) {
    try {
      const stored = localStorage.getItem(`sqlite_${name}`);
      tables[name] = stored ? JSON.parse(stored) : [];
    } catch {
      tables[name] = [];
    }
  }
  return tables[name];
}

function saveTable(name: string) {
  localStorage.setItem(`sqlite_${name}`, JSON.stringify(tables[name] || []));
}

class WebSQLiteDatabase {
  async execAsync(_sql: string): Promise<void> {
    // CREATE TABLE statements — just ensure tables exist
    const createMatch = _sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/gi);
    if (createMatch) {
      for (const match of createMatch) {
        const tableName = match.replace(/CREATE TABLE IF NOT EXISTS /i, "").trim();
        loadTable(tableName);
      }
    }
  }

  async runAsync(sql: string, ...params: unknown[]): Promise<{ changes: number }> {
    const sqlLower = sql.trim().toLowerCase();

    if (sqlLower.startsWith("insert into")) {
      const tableMatch = sql.match(/INSERT INTO (\w+)/i);
      if (!tableMatch) return { changes: 0 };
      const table = tableMatch[1];
      const rows = loadTable(table);

      // Extract column names from the SQL
      const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
      if (!colMatch) return { changes: 0 };
      const cols = colMatch[1].split(",").map((c) => c.trim());

      const row: Row = {};
      cols.forEach((col, i) => {
        // Replace datetime('now') placeholder values with actual ISO dates
        const val = params[i];
        row[col] = val ?? null;
      });
      rows.push(row);
      saveTable(table);
      return { changes: 1 };
    }

    if (sqlLower.startsWith("update")) {
      const tableMatch = sql.match(/UPDATE (\w+)/i);
      if (!tableMatch) return { changes: 0 };
      const table = tableMatch[1];
      const rows = loadTable(table);

      // Extract SET column names (only those with ? placeholders)
      const setMatch = sql.match(/SET (.+?) WHERE/i);
      if (!setMatch) return { changes: 0 };
      const setCols: string[] = [];
      for (const part of setMatch[1].split(",")) {
        const colName = part.split("=")[0].trim();
        // Only include columns bound to ? params, skip SQL expressions
        if (part.includes("?")) {
          setCols.push(colName);
        }
      }

      // WHERE value is the last param
      const idValue = params[params.length - 1];
      let changes = 0;
      for (const row of rows) {
        if (row.id === idValue) {
          setCols.forEach((col, i) => {
            row[col] = params[i] ?? null;
          });
          changes++;
        }
      }
      if (changes > 0) saveTable(table);
      return { changes };
    }

    if (sqlLower.startsWith("delete from")) {
      const tableMatch = sql.match(/DELETE FROM (\w+)/i);
      if (!tableMatch) return { changes: 0 };
      const table = tableMatch[1];
      const rows = loadTable(table);
      const idValue = params[params.length - 1];
      const before = rows.length;
      tables[table] = rows.filter((r) => r.id !== idValue && r.chat_id !== idValue);
      saveTable(table);
      return { changes: before - tables[table].length };
    }

    return { changes: 0 };
  }

  async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    const tableMatch = sql.match(/FROM (\w+)/i);
    if (!tableMatch) return [];
    const table = tableMatch[1];
    const rows = loadTable(table);

    let filtered = [...rows];

    // Simple WHERE clause handling
    if (sql.toLowerCase().includes("where")) {
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s*$)/i);
      if (whereMatch) {
        const conditions = whereMatch[1];
        if (conditions.includes("chat_id = ?")) {
          filtered = filtered.filter((r) => r.chat_id === params[0]);
        } else if (conditions.includes("id = ?")) {
          filtered = filtered.filter((r) => r.id === params[0]);
        } else if (conditions.includes("LIKE")) {
          const pattern = String(params[0] || "").replace(/%/g, "").toLowerCase();
          if (pattern) {
            filtered = filtered.filter(
              (r) =>
                String(r.title || "").toLowerCase().includes(pattern) ||
                String(r.content || "").toLowerCase().includes(pattern)
            );
          }
        }
      }
    }

    // ORDER BY
    if (sql.toLowerCase().includes("order by")) {
      const orderMatch = sql.match(/ORDER BY (\w+)\s*(ASC|DESC)?/i);
      if (orderMatch) {
        const col = orderMatch[1];
        const desc = orderMatch[2]?.toUpperCase() === "DESC";
        filtered.sort((a, b) => {
          const va = String(a[col] || "");
          const vb = String(b[col] || "");
          return desc ? vb.localeCompare(va) : va.localeCompare(vb);
        });
      }
    }

    return filtered as T[];
  }

  async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    const results = await this.getAllAsync<T>(sql, ...params);
    return results[0] || null;
  }
}

export async function openDatabaseAsync(_name: string): Promise<WebSQLiteDatabase> {
  return new WebSQLiteDatabase();
}
