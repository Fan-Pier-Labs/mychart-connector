/**
 * Builds and refreshes the on-device patient memory.
 *
 * - buildInitialMemory: full ingest of all MEMORY_CATEGORIES on first
 *   successful MyChart connect.
 * - refreshMemory: cheap delta — re-fetches each category, hashes the
 *   serialized result, and only feeds categories whose content changed
 *   to the AI. If nothing changed, the AI isn't called at all.
 */

import { executeScraperTool } from "@/lib/scrapers/session-manager";
import { oneShotComplete, type ChatMessage } from "@/lib/ai/claude-client";
import {
  getMemorySummary,
  setMemorySummary,
  upsertInsightsForAccount,
  getAllSyncStates,
  setSyncState,
} from "@/lib/storage/database";
import { getMyChartAccounts } from "@/lib/storage/secure-store";
import {
  buildMemorySystemPrompt,
  buildInitialMemoryUserPrompt,
  buildRefreshMemoryUserPrompt,
  parseAiMemoryResponse,
} from "./prompts";
import { MEMORY_CATEGORIES, type MemoryCategory } from "./types";

const GENERATOR_TAG = "expo-memory-v1";

type CategoryFetch = {
  category: MemoryCategory;
  data: unknown;
  hash: string;
};

async function fetchCategory(
  hostname: string,
  category: MemoryCategory,
): Promise<CategoryFetch | null> {
  try {
    const data = await executeScraperTool(category, { instance: hostname });
    return { category, data, hash: cheapHash(JSON.stringify(data ?? null)) };
  } catch (err) {
    console.warn(`[memory] ${category} failed for ${hostname}:`, (err as Error).message);
    return null;
  }
}

async function fetchAllCategories(hostname: string): Promise<CategoryFetch[]> {
  const results = await Promise.all(MEMORY_CATEGORIES.map((c) => fetchCategory(hostname, c)));
  return results.filter((r): r is CategoryFetch => r !== null);
}

function recordsToObject(fetches: CategoryFetch[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fetches) out[f.category] = f.data;
  return out;
}

async function getHostnameForAccount(accountId: string): Promise<string | null> {
  const accounts = await getMyChartAccounts();
  return accounts.find((a) => a.id === accountId)?.hostname ?? null;
}

/**
 * Full ingest. Called after the first successful connect to a new
 * MyChart account. Safe to re-run — overwrites memory_summary and
 * upserts insights by title.
 */
export async function buildInitialMemory(accountId: string): Promise<void> {
  const hostname = await getHostnameForAccount(accountId);
  if (!hostname) {
    console.warn(`[memory] no account for ${accountId}`);
    return;
  }

  const fetches = await fetchAllCategories(hostname);
  if (fetches.length === 0) {
    console.warn(`[memory] no scraper data returned for ${accountId}; skipping initial build`);
    return;
  }

  const records = recordsToObject(fetches);
  const system = buildMemorySystemPrompt();
  const user: ChatMessage = { role: "user", content: buildInitialMemoryUserPrompt(records) };

  let raw: string;
  try {
    raw = await oneShotComplete([user], system, "default");
  } catch (err) {
    console.warn(`[memory] initial AI call failed:`, (err as Error).message);
    return;
  }

  const parsed = parseAiMemoryResponse(raw);
  if (!parsed) {
    console.warn(`[memory] could not parse AI response for initial build`);
    return;
  }

  await persist(accountId, parsed, fetches);
}

/**
 * Delta refresh. Re-fetches each memory category, compares each
 * category's content hash to the last-seen hash, and only asks the AI
 * to update if at least one category changed. Cheap to call frequently.
 */
export async function refreshMemory(accountId: string): Promise<{ updated: boolean; reason?: string }> {
  const hostname = await getHostnameForAccount(accountId);
  if (!hostname) return { updated: false, reason: "no_account" };

  const existing = await getMemorySummary(accountId);
  if (!existing) {
    // No prior memory → fall through to a full build.
    await buildInitialMemory(accountId);
    return { updated: true, reason: "no_prior_memory" };
  }

  const fetches = await fetchAllCategories(hostname);
  if (fetches.length === 0) return { updated: false, reason: "no_data" };

  const lastHashes = await loadLastHashes(accountId);
  const changed = fetches.filter((f) => lastHashes.get(f.category) !== f.hash);
  if (changed.length === 0) {
    // Touch sync state so we don't keep re-running fetches in a tight
    // loop. Hashes are unchanged so nothing else needs writing.
    for (const f of fetches) await setSyncState(accountId, f.category, f.hash);
    return { updated: false, reason: "no_changes" };
  }

  const newRecords = recordsToObject(changed);
  const system = buildMemorySystemPrompt();
  const user: ChatMessage = {
    role: "user",
    content: buildRefreshMemoryUserPrompt(existing.summary_md, existing.facts_json, newRecords),
  };

  let raw: string;
  try {
    raw = await oneShotComplete([user], system, "default");
  } catch (err) {
    console.warn(`[memory] refresh AI call failed:`, (err as Error).message);
    return { updated: false, reason: "ai_error" };
  }

  const parsed = parseAiMemoryResponse(raw);
  if (!parsed) {
    console.warn(`[memory] could not parse AI response for refresh`);
    return { updated: false, reason: "parse_error" };
  }

  await persist(accountId, parsed, fetches);
  return { updated: true };
}

async function persist(
  accountId: string,
  parsed: { summary_md: string; facts: unknown[]; insights: Array<{ title: string; body_md: string; severity: string; suggested_question?: string | null; source_refs?: string[] }> },
  fetches: CategoryFetch[],
): Promise<void> {
  await setMemorySummary({
    account_id: accountId,
    summary_md: parsed.summary_md,
    facts_json: JSON.stringify(parsed.facts ?? []),
    generated_at: new Date().toISOString(),
    generator_model: GENERATOR_TAG,
  });

  const validSeverity = (s: string): s is "info" | "discuss" | "discuss_soon" =>
    s === "info" || s === "discuss" || s === "discuss_soon";

  const insights = parsed.insights
    .filter((i) => i && typeof i.title === "string" && typeof i.body_md === "string")
    .map((i) => ({
      title: i.title.slice(0, 200),
      body_md: i.body_md.slice(0, 4000),
      severity: validSeverity(i.severity) ? i.severity : "info",
      suggested_question: i.suggested_question ?? null,
      source_refs: Array.isArray(i.source_refs) ? JSON.stringify(i.source_refs) : null,
    }));

  if (insights.length > 0) {
    await upsertInsightsForAccount(accountId, insights);
  }

  for (const f of fetches) await setSyncState(accountId, f.category, f.hash);
}

async function loadLastHashes(accountId: string): Promise<Map<string, string | null>> {
  const states = await getAllSyncStates(accountId);
  const map = new Map<string, string | null>();
  for (const s of states) map.set(s.category, s.last_seen_at);
  return map;
}

/**
 * Combine the AI-generated summary with the user-reported facts blob
 * into a single digest string, ready to drop into the chat system prompt.
 */
export async function loadDigestForChat(accountId: string): Promise<string | null> {
  const memory = await getMemorySummary(accountId);
  if (!memory) return null;
  let factsBlock = "";
  try {
    const facts = JSON.parse(memory.facts_json) as Array<{ text?: string }>;
    const lines = facts
      .filter((f) => f && typeof f.text === "string")
      .slice(-30)
      .map((f) => `- ${f.text}`)
      .join("\n");
    if (lines) factsBlock = `\n\n## User-Reported Facts\n${lines}`;
  } catch {
    /* ignore */
  }
  return memory.summary_md + factsBlock;
}

/**
 * 32-bit FNV-1a — good enough for change detection on JSON payloads.
 * Not cryptographic; just need to know if content changed.
 */
function cheapHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}
