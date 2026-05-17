import { describe, expect, test } from "bun:test";
import { extractToolCalls } from "../tool-call-parser";

describe("extractToolCalls", () => {
  test("returns [] for empty input", () => {
    expect(extractToolCalls("")).toEqual([]);
  });

  test("returns [] for pure prose with no JSON", () => {
    expect(extractToolCalls("Sorry, I can't help with that.")).toEqual([]);
  });

  test("extracts a single tool call", () => {
    const calls = extractToolCalls('{"tool": "get_meds", "args": {}}');
    expect(calls).toEqual([{ tool: "get_meds", args: {} }]);
  });

  test("defaults missing args to {}", () => {
    const calls = extractToolCalls('{"tool": "get_meds"}');
    expect(calls).toEqual([{ tool: "get_meds", args: {} }]);
  });

  test("ignores non-object args (string, array)", () => {
    expect(extractToolCalls('{"tool": "x", "args": "oops"}')).toEqual([
      { tool: "x", args: {} },
    ]);
    expect(extractToolCalls('{"tool": "x", "args": [1, 2]}')).toEqual([
      { tool: "x", args: {} },
    ]);
  });

  test("extracts multiple JSON objects in one response", () => {
    const raw = `
      { "tool": "get_billing", "args": {} }
      { "tool": "get_messages", "args": { "limit": 50 } }
      { "tool": "get_message_recipients", "args": {} }
    `;
    const calls = extractToolCalls(raw);
    expect(calls).toEqual([
      { tool: "get_billing", args: {} },
      { tool: "get_messages", args: { limit: 50 } },
      { tool: "get_message_recipients", args: {} },
    ]);
  });

  test("extracts tool calls that are interleaved with prose (the production bug)", () => {
    // Verbatim shape from the broken phone log.
    const raw = `I'll start by pulling your billing history and messages at the same time to check what's already been requested.
{ "tool": "get_billing", "args": {} }

{ "tool": "get_messages", "args": { "limit": 50, "offset": 0 } }

Let me get your billing history first, then check your messages.
{ "tool": "get_billing", "args": {} }

{ "tool": "get_message_recipients", "args": {} }`;
    const calls = extractToolCalls(raw);
    expect(calls).toEqual([
      { tool: "get_billing", args: {} },
      { tool: "get_messages", args: { limit: 50, offset: 0 } },
      { tool: "get_billing", args: {} },
      { tool: "get_message_recipients", args: {} },
    ]);
  });

  test("strips markdown code fences", () => {
    const raw = '```json\n{"tool": "get_meds", "args": {}}\n```';
    expect(extractToolCalls(raw)).toEqual([{ tool: "get_meds", args: {} }]);
  });

  test("handles nested args objects", () => {
    const calls = extractToolCalls(
      '{"tool": "send_message", "args": {"recipient": {"name": "Dr. Hibbert"}, "body": "hi"}}',
    );
    expect(calls).toEqual([
      {
        tool: "send_message",
        args: { recipient: { name: "Dr. Hibbert" }, body: "hi" },
      },
    ]);
  });

  test("handles strings containing braces", () => {
    const calls = extractToolCalls(
      '{"tool": "send_message", "args": {"body": "use { and } in your text"}}',
    );
    expect(calls).toEqual([
      { tool: "send_message", args: { body: "use { and } in your text" } },
    ]);
  });

  test("handles strings with escaped quotes", () => {
    const calls = extractToolCalls(
      '{"tool": "send_message", "args": {"body": "say \\"hi\\" please"}}',
    );
    expect(calls).toEqual([
      { tool: "send_message", args: { body: 'say "hi" please' } },
    ]);
  });

  test("ignores JSON objects without a tool field", () => {
    const raw = '{"foo": "bar"} {"tool": "get_meds", "args": {}}';
    expect(extractToolCalls(raw)).toEqual([{ tool: "get_meds", args: {} }]);
  });

  test("ignores malformed JSON objects", () => {
    const raw = '{tool: not_quoted} {"tool": "get_meds", "args": {}}';
    expect(extractToolCalls(raw)).toEqual([{ tool: "get_meds", args: {} }]);
  });

  test("recovers from stray closing braces in prose", () => {
    const raw = 'Here you go } { "tool": "get_meds", "args": {} }';
    expect(extractToolCalls(raw)).toEqual([{ tool: "get_meds", args: {} }]);
  });

  test("extracts respond as a tool call like any other", () => {
    const calls = extractToolCalls('{"tool": "respond", "args": {"text": "here you go"}}');
    expect(calls).toEqual([{ tool: "respond", args: { text: "here you go" } }]);
  });
});
