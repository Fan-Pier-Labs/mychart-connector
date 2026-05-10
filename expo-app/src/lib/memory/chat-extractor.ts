/**
 * Post-turn fact extraction. After the assistant emits a final
 * answer, we ask a small model to pick out durable health facts the
 * user shared (symptoms, lifestyle, family history, concerns) and
 * append them to the patient memory's facts_json blob.
 *
 * Cheap and best-effort: errors are logged and swallowed.
 */

import { oneShotComplete, type ChatMessage } from "@/lib/ai/claude-client";
import {
  getMemorySummary,
  setMemorySummary,
} from "@/lib/storage/database";
import { getMyChartAccounts } from "@/lib/storage/secure-store";
import {
  getExtractorSystemPrompt,
  buildExtractorUserPrompt,
  parseExtractorResponse,
} from "./prompts";

const MAX_FACTS = 200;

/**
 * Extract user-stated facts from one chat turn and merge into memory.
 * Runs against the first connected account by default — if you have
 * multiple accounts, pass accountId explicitly.
 */
export async function extractFactsFromTurn(
  userMessage: string,
  assistantMessage: string,
  accountId?: string,
): Promise<{ added: number }> {
  if (!userMessage.trim() || !assistantMessage.trim()) return { added: 0 };

  const targetAccountId = accountId ?? (await firstAccountId());
  if (!targetAccountId) return { added: 0 };

  const existing = await getMemorySummary(targetAccountId);
  if (!existing) {
    // No baseline memory yet — nothing to merge into. The initial
    // build will pick up everything from MyChart anyway.
    return { added: 0 };
  }

  const system = getExtractorSystemPrompt();
  const user: ChatMessage = {
    role: "user",
    content: buildExtractorUserPrompt(userMessage, assistantMessage),
  };

  let raw: string;
  try {
    raw = await oneShotComplete([user], system, "mini");
  } catch (err) {
    console.warn(`[memory] extractor failed:`, (err as Error).message);
    return { added: 0 };
  }

  const newFacts = parseExtractorResponse(raw);
  if (newFacts.length === 0) return { added: 0 };

  let existingFacts: Array<{ category: string; text: string; source?: string }>;
  try {
    const parsed = JSON.parse(existing.facts_json);
    existingFacts = Array.isArray(parsed) ? parsed : [];
  } catch {
    existingFacts = [];
  }

  // Dedupe by exact text (case-insensitive). Prefer the existing entry.
  const seen = new Set(existingFacts.map((f) => f.text.toLowerCase().trim()));
  let added = 0;
  for (const fact of newFacts) {
    const key = fact.text.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    existingFacts.push({ category: fact.category, text: fact.text, source: "user" });
    added++;
  }

  if (added === 0) return { added: 0 };

  // Cap the list so it never grows unbounded.
  const trimmed = existingFacts.slice(-MAX_FACTS);

  await setMemorySummary({
    ...existing,
    facts_json: JSON.stringify(trimmed),
  });

  return { added };
}

async function firstAccountId(): Promise<string | null> {
  const accounts = await getMyChartAccounts();
  return accounts[0]?.id ?? null;
}
