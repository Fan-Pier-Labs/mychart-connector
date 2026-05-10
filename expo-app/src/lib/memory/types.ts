/**
 * Shape returned by the AI for a memory build / refresh.
 *
 * The model is asked to emit JSON matching this schema. We then write
 * it to memory_summary + insights tables.
 */
export type AiMemoryResponse = {
  summary_md: string;
  facts: AiFact[];
  insights: AiInsight[];
};

export type AiFact = {
  category: string;
  text: string;
  source?: "mychart" | "user" | "derived";
};

export type AiInsight = {
  title: string;
  body_md: string;
  severity: "info" | "discuss" | "discuss_soon";
  suggested_question?: string | null;
  source_refs?: string[];
};

/**
 * The set of MyChart categories we ingest into memory. Each maps to
 * an executeScraperTool tool name. Keep this list narrow — we want
 * the categories that are clinically useful for digesting and
 * spotting patterns. Big stuff like raw documents/letters/messages
 * aren't worth the tokens for the digest.
 */
export const MEMORY_CATEGORIES = [
  "get_profile",
  "get_health_summary",
  "get_health_issues",
  "get_medications",
  "get_allergies",
  "get_lab_results",
  "get_imaging_results",
  "get_vitals",
  "get_immunizations",
  "get_preventive_care",
  "get_medical_history",
  "get_past_visits",
  "get_upcoming_visits",
  "get_care_team",
  "get_referrals",
  "get_goals",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];
