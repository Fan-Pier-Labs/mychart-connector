import type { AiMemoryResponse } from "./types";

const SAFETY = [
  "You are NOT a doctor and must NOT diagnose, prescribe, or recommend specific treatments.",
  "Frame every observation as something the patient should consider discussing with their care team.",
  "When suggesting things, use phrases like \"worth asking your doctor about\" or \"consider mentioning at your next visit\".",
  "Do NOT invent data. If a category was not provided, do not speculate about it.",
  "Be specific and reference real numbers/dates from the records when relevant — patients trust details, not vague generalities.",
].join(" ");

const OUTPUT_SCHEMA = `Output ONLY valid JSON with this exact shape, no markdown fences, no commentary:
{
  "summary_md": "<markdown digest of the patient — see structure below>",
  "facts": [
    { "category": "<short category like 'condition' or 'medication' or 'lab_trend'>", "text": "<one-sentence fact>", "source": "mychart" }
  ],
  "insights": [
    {
      "title": "<short title, e.g. 'Persistently elevated ferritin'>",
      "body_md": "<2-4 sentence markdown explanation citing the supporting data>",
      "severity": "info" | "discuss" | "discuss_soon",
      "suggested_question": "<one question the patient could ask their doctor, or null>",
      "source_refs": ["<short reference to which records support this, e.g. 'Ferritin 412, 387, 401 ng/mL'>"]
    }
  ]
}`;

const SUMMARY_STRUCTURE = [
  "summary_md should be markdown with these sections (omit a section only if there is no data):",
  "## Demographics",
  "## Active Conditions",
  "## Current Medications",
  "## Allergies",
  "## Recent Vitals",
  "## Lab Trends (only the ones that have moved or are out of range)",
  "## Recent Visits",
  "## Upcoming Care",
  "## Notable Patterns (1–3 bullet points the patient should be aware of)",
  "Keep it concise — aim for under 1500 words total. This is a digest, not a record dump.",
].join("\n");

const SEVERITY_GUIDE = [
  "Severity guidelines:",
  "- info: educational context, no action needed (e.g. 'Cholesterol has been stable in normal range').",
  "- discuss: worth bringing up at the next routine visit (e.g. 'Mild trend toward higher BP over 3 readings').",
  "- discuss_soon: a pattern that is uncommon enough to be worth a non-urgent message to the care team (e.g. 'Persistently elevated ferritin across multiple draws').",
  "Do NOT use anything more urgent than discuss_soon. If something looks acutely dangerous, the insight body should explicitly say to contact their care team but use discuss_soon for the severity.",
  "Be selective. Better to surface 3–6 strong insights than 15 weak ones. If nothing notable, return an empty insights array.",
].join("\n");

export function buildMemorySystemPrompt(): string {
  return [
    "You are a careful health-records analyst building a patient digest from raw MyChart data.",
    SAFETY,
    "",
    SUMMARY_STRUCTURE,
    "",
    SEVERITY_GUIDE,
    "",
    OUTPUT_SCHEMA,
  ].join("\n");
}

export function buildInitialMemoryUserPrompt(
  recordsByCategory: Record<string, unknown>,
): string {
  const sections = Object.entries(recordsByCategory)
    .map(([category, data]) => {
      const json = JSON.stringify(data, null, 2);
      // Truncate any one category that runs away — Gemini's window is huge
      // but we still want to keep one category from blowing the budget.
      const trimmed = json.length > 60_000 ? json.slice(0, 60_000) + "\n…(truncated)…" : json;
      return `=== ${category} ===\n${trimmed}`;
    })
    .join("\n\n");
  return [
    "Build the initial patient digest from these MyChart records.",
    "",
    sections,
    "",
    "Remember: output ONLY the JSON object, nothing else.",
  ].join("\n");
}

export function buildRefreshMemoryUserPrompt(
  existingSummary: string,
  existingFactsJson: string,
  newRecordsByCategory: Record<string, unknown>,
): string {
  const sections = Object.entries(newRecordsByCategory)
    .map(([category, data]) => {
      const json = JSON.stringify(data, null, 2);
      const trimmed = json.length > 60_000 ? json.slice(0, 60_000) + "\n…(truncated)…" : json;
      return `=== ${category} (new since last sync) ===\n${trimmed}`;
    })
    .join("\n\n");
  return [
    "Update the patient digest below with these newly available records.",
    "Keep everything from the existing summary that is still accurate; integrate the new information; flag any new patterns as insights.",
    "",
    "=== existing summary_md ===",
    existingSummary,
    "",
    "=== existing facts (JSON) ===",
    existingFactsJson,
    "",
    "=== new records ===",
    sections,
    "",
    "Output ONLY the JSON object (full replacement summary_md + facts + insights), nothing else.",
  ].join("\n");
}

const EXTRACTOR_SYSTEM = [
  "You extract durable health facts from a single chat exchange and add them to the patient memory.",
  "Only extract things the USER stated about themselves that are persistent (symptoms they keep having, lifestyle facts, family history, things they're worried about, preferences for their care).",
  "Do NOT extract: questions, one-off curiosity, things the assistant said, or facts already obvious from MyChart records.",
  "If nothing qualifies, return an empty array.",
  "",
  "Output ONLY a JSON array, no commentary:",
  '[ { "category": "<symptom|lifestyle|family_history|concern|preference>", "text": "<one short sentence>" } ]',
].join("\n");

export function getExtractorSystemPrompt(): string {
  return EXTRACTOR_SYSTEM;
}

export function buildExtractorUserPrompt(userMsg: string, assistantMsg: string): string {
  return [
    "Latest exchange:",
    "",
    `User: ${userMsg}`,
    "",
    `Assistant: ${assistantMsg}`,
    "",
    "Return the JSON array.",
  ].join("\n");
}

/**
 * Best-effort JSON extraction. The model sometimes wraps output in
 * fences or adds prose despite instructions. Find the first balanced
 * {...} (or [...]) and parse that.
 */
export function parseAiMemoryResponse(raw: string): AiMemoryResponse | null {
  const obj = extractJsonObject(raw);
  if (!obj) return null;
  if (typeof obj !== "object") return null;
  const candidate = obj as Partial<AiMemoryResponse>;
  if (typeof candidate.summary_md !== "string") return null;
  if (!Array.isArray(candidate.insights)) return null;
  if (!Array.isArray(candidate.facts)) return null;
  return candidate as AiMemoryResponse;
}

export function parseExtractorResponse(raw: string): Array<{ category: string; text: string }> {
  const arr = extractJsonArray(raw);
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(
      (item): item is { category: string; text: string } =>
        !!item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string",
    )
    .map((item) => ({
      category: typeof item.category === "string" ? item.category : "fact",
      text: item.text,
    }));
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function extractJsonArray(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}
