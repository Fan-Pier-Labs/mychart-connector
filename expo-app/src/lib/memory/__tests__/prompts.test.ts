import { describe, expect, test } from "bun:test";
import {
  buildMemorySystemPrompt,
  buildInitialMemoryUserPrompt,
  buildRefreshMemoryUserPrompt,
  buildExtractorUserPrompt,
  getExtractorSystemPrompt,
  parseAiMemoryResponse,
  parseExtractorResponse,
} from "../prompts";

describe("buildMemorySystemPrompt", () => {
  const sys = buildMemorySystemPrompt();

  test("includes the not-a-doctor safety guardrail", () => {
    expect(sys).toContain("NOT a doctor");
    expect(sys).toContain("discussing with their care team");
  });

  test("requires JSON-only output", () => {
    expect(sys).toContain("Output ONLY valid JSON");
    expect(sys).toContain("summary_md");
    expect(sys).toContain("insights");
    expect(sys).toContain("severity");
  });

  test("describes severity tiers and caps at discuss_soon", () => {
    expect(sys).toContain("info:");
    expect(sys).toContain("discuss:");
    expect(sys).toContain("discuss_soon:");
    expect(sys).toContain("Do NOT use anything more urgent than discuss_soon");
  });
});

describe("buildInitialMemoryUserPrompt", () => {
  test("serializes each category and labels it", () => {
    const out = buildInitialMemoryUserPrompt({
      get_medications: { medications: [{ name: "Lisinopril" }] },
      get_allergies: { allergies: [] },
    });
    expect(out).toContain("=== get_medications ===");
    expect(out).toContain("Lisinopril");
    expect(out).toContain("=== get_allergies ===");
    expect(out).toContain("output ONLY the JSON object");
  });

  test("truncates oversized payloads to keep one category from blowing the budget", () => {
    const huge = { items: Array.from({ length: 100_000 }).map(() => "x".repeat(10)) };
    const out = buildInitialMemoryUserPrompt({ get_lab_results: huge });
    expect(out).toContain("…(truncated)…");
  });
});

describe("buildRefreshMemoryUserPrompt", () => {
  test("includes existing summary, facts, and new records", () => {
    const out = buildRefreshMemoryUserPrompt(
      "## Demographics\nFake patient",
      JSON.stringify([{ category: "condition", text: "fake fact" }]),
      { get_lab_results: { results: [] } },
    );
    expect(out).toContain("=== existing summary_md ===");
    expect(out).toContain("Fake patient");
    expect(out).toContain("=== existing facts (JSON) ===");
    expect(out).toContain("fake fact");
    expect(out).toContain("=== new records ===");
    expect(out).toContain("get_lab_results");
  });
});

describe("parseAiMemoryResponse", () => {
  test("parses well-formed JSON", () => {
    const raw = JSON.stringify({
      summary_md: "## Demographics\nx",
      facts: [{ category: "condition", text: "fake" }],
      insights: [
        {
          title: "Title",
          body_md: "body",
          severity: "discuss",
          suggested_question: "ask?",
          source_refs: ["a", "b"],
        },
      ],
    });
    const parsed = parseAiMemoryResponse(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.summary_md).toContain("Demographics");
    expect(parsed!.insights).toHaveLength(1);
    expect(parsed!.facts).toHaveLength(1);
  });

  test("strips markdown code fences", () => {
    const raw = "```json\n" + JSON.stringify({
      summary_md: "x",
      facts: [],
      insights: [],
    }) + "\n```";
    const parsed = parseAiMemoryResponse(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.summary_md).toBe("x");
  });

  test("rejects malformed JSON", () => {
    expect(parseAiMemoryResponse("not json at all")).toBeNull();
    expect(parseAiMemoryResponse("{")).toBeNull();
  });

  test("rejects responses missing required fields", () => {
    expect(parseAiMemoryResponse(JSON.stringify({ insights: [], facts: [] }))).toBeNull();
    expect(parseAiMemoryResponse(JSON.stringify({ summary_md: "x", insights: [] }))).toBeNull();
    expect(parseAiMemoryResponse(JSON.stringify({ summary_md: "x", facts: [] }))).toBeNull();
  });
});

describe("getExtractorSystemPrompt", () => {
  const sys = getExtractorSystemPrompt();

  test("instructs the model to skip questions and assistant content", () => {
    expect(sys).toContain("Do NOT extract");
    expect(sys).toContain("questions");
    expect(sys).toContain("things the assistant said");
  });

  test("permits an empty array when nothing qualifies", () => {
    expect(sys).toContain("empty array");
  });
});

describe("buildExtractorUserPrompt", () => {
  test("includes both sides of the exchange", () => {
    const out = buildExtractorUserPrompt(
      "I've been getting headaches every morning.",
      "Sorry to hear that — how long has this been going on?",
    );
    expect(out).toContain("User: I've been getting headaches every morning.");
    expect(out).toContain("Assistant: Sorry to hear that");
  });
});

describe("parseExtractorResponse", () => {
  test("parses a JSON array of facts", () => {
    const raw = JSON.stringify([
      { category: "symptom", text: "morning headaches" },
      { category: "lifestyle", text: "doesn't drink coffee" },
    ]);
    const parsed = parseExtractorResponse(raw);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].text).toBe("morning headaches");
    expect(parsed[1].category).toBe("lifestyle");
  });

  test("returns empty array for non-array responses", () => {
    expect(parseExtractorResponse("{}")).toEqual([]);
    expect(parseExtractorResponse("not json")).toEqual([]);
  });

  test("filters out malformed entries", () => {
    const raw = JSON.stringify([
      { text: "ok" },
      { not_text: "skip me" },
      "not an object",
      { text: "also ok", category: "concern" },
    ]);
    const parsed = parseExtractorResponse(raw);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].text).toBe("ok");
    expect(parsed[1].category).toBe("concern");
  });

  test("defaults missing category to 'fact'", () => {
    const raw = JSON.stringify([{ text: "no category" }]);
    const parsed = parseExtractorResponse(raw);
    expect(parsed[0].category).toBe("fact");
  });

  test("strips code fences", () => {
    const raw = "```json\n[{\"text\":\"hi\"}]\n```";
    const parsed = parseExtractorResponse(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].text).toBe("hi");
  });
});
