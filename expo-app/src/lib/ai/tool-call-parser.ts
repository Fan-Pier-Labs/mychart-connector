/**
 * Parse tool calls out of an LLM response.
 *
 * The model is prompted to emit one or more JSON objects of the shape
 * `{"tool": "<name>", "args": { ... }}`. We scan the response for every
 * balanced top-level `{...}` span, JSON.parse each, and keep the ones
 * that look like a tool call (have a string `tool` field). Anything
 * else — prose, malformed JSON, JSON without a `tool` field — is
 * silently ignored so prose intermixed with tool calls doesn't tank
 * the entire turn.
 */

export type ParsedToolCall = {
  tool: string;
  args: Record<string, unknown>;
};

export function extractToolCalls(raw: string): ParsedToolCall[] {
  if (!raw) return [];

  // Strip markdown code fences so JSON inside ```json ... ``` is reachable.
  const stripped = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "");

  const calls: ParsedToolCall[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        const span = stripped.slice(start, i + 1);
        const call = tryParseToolCall(span);
        if (call) calls.push(call);
        start = -1;
      }
      // Resync on unbalanced text (e.g. stray `}` in prose).
      if (depth < 0) depth = 0;
    }
  }

  return calls;
}

function tryParseToolCall(span: string): ParsedToolCall | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(span);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.tool !== "string") return null;
  const args =
    obj.args && typeof obj.args === "object" && !Array.isArray(obj.args)
      ? (obj.args as Record<string, unknown>)
      : {};
  return { tool: obj.tool, args };
}
