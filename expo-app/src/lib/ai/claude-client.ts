/**
 * Model-agnostic chat client.
 *
 * Sends user messages to the backend's /api/ai endpoint (currently
 * Gemini, swappable server-side). Tool use is expressed by prompting
 * the model to emit JSON — either a tool call or a final answer —
 * instead of using any provider-native tool schema. That lets us point
 * this client at any reasonable chat model without code changes.
 *
 * Protocol:
 *   • System prompt lists the available tools and tells the model to
 *     respond with ONE of these JSON shapes, nothing else:
 *       {"tool": "<name>", "args": {...}}
 *       {"answer": "<text for the user>"}
 *   • If the model emits a tool call, we execute it locally and append
 *     its result as a new user message, then loop.
 *   • If the model emits an answer (or free-form text that doesn't
 *     parse), we surface it to the user and stop.
 */

import { getClaudeApiKey, getSelectedModel } from "@/lib/storage/secure-store";
import { getBackendSession } from "@/lib/backend/session";
import { backendUrl } from "@/lib/backend/client";

export type ToolCall = {
  id: string;
  name: string;
  input: Record<string, unknown>;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const TOOLS: { name: string; description: string; args: Record<string, string> }[] = [
  { name: "get_profile", description: "Get the user's MyChart profile information", args: { instance: "MyChart hostname (optional if only one account)" } },
  { name: "get_health_summary", description: "Get a summary of the user's health information", args: { instance: "optional" } },
  { name: "get_medications", description: "Get current and past medications", args: { instance: "optional" } },
  { name: "get_allergies", description: "Get allergy information", args: { instance: "optional" } },
  { name: "get_health_issues", description: "Get health issues / problem list", args: { instance: "optional" } },
  { name: "get_upcoming_visits", description: "Get upcoming appointments", args: { instance: "optional" } },
  { name: "get_past_visits", description: "Get past visit history", args: { instance: "optional", years_back: "number, optional" } },
  { name: "get_lab_results", description: "Get lab test results", args: { instance: "optional", limit: "number", offset: "number" } },
  { name: "get_messages", description: "Get MyChart messages/conversations with providers", args: { instance: "optional", limit: "number", offset: "number" } },
  { name: "get_billing", description: "Get billing history", args: { instance: "optional", limit: "number", offset: "number" } },
  { name: "get_care_team", description: "Get care team members", args: { instance: "optional" } },
  { name: "get_insurance", description: "Get insurance information", args: { instance: "optional" } },
  { name: "get_immunizations", description: "Get immunization records", args: { instance: "optional" } },
  { name: "get_preventive_care", description: "Get preventive care recommendations", args: { instance: "optional" } },
  { name: "get_vitals", description: "Get vital signs history", args: { instance: "optional" } },
  { name: "get_documents", description: "Get medical documents", args: { instance: "optional" } },
  { name: "get_imaging_results", description: "Get imaging/radiology results", args: { instance: "optional", limit: "number", offset: "number" } },
  { name: "get_letters", description: "Get letters from providers", args: { instance: "optional" } },
  { name: "get_referrals", description: "Get referral information", args: { instance: "optional" } },
  { name: "get_medical_history", description: "Get medical history", args: { instance: "optional" } },
  { name: "get_emergency_contacts", description: "Get emergency contacts", args: { instance: "optional" } },
  { name: "get_activity_feed", description: "Get recent activity feed", args: { instance: "optional" } },
  { name: "get_care_journeys", description: "Get care journey information", args: { instance: "optional" } },
  { name: "get_goals", description: "Get health goals", args: { instance: "optional" } },
  { name: "get_education_materials", description: "Get patient education materials", args: { instance: "optional" } },
  { name: "get_message_recipients", description: "List available message recipients and topics (use before send_message if unsure who to message)", args: { instance: "optional" } },
  { name: "send_message", description: "Send a new message to a MyChart provider. Confirm with the user before sending.", args: { instance: "optional", recipient_name: "provider name (fuzzy match)", topic: "topic (fuzzy match, e.g. 'Medical Question')", subject: "subject line", message_body: "message body" } },
  { name: "send_reply", description: "Reply to an existing MyChart conversation. Confirm with the user before sending.", args: { instance: "optional", conversation_id: "conversation id from get_messages", message_body: "reply text" } },
  { name: "request_refill", description: "Request a medication refill. Confirm with the user before submitting.", args: { instance: "optional", medication_name: "medication name (fuzzy match)" } },
];

function buildSystemPrompt(): string {
  const toolList = TOOLS.map(
    (t) => `- ${t.name}(${Object.keys(t.args).join(", ")}) — ${t.description}`,
  ).join("\n");
  return [
    "You are a health assistant with access to the user's MyChart medical records.",
    "Be genuinely helpful: explain the user's records in plain language, summarize information, and offer general educational guidance about conditions, medications, diet, exercise, and lifestyle when asked.",
    "You may discuss what their data shows, what conditions mean, what medications are for, and general management approaches (e.g. diet, exercise, sleep, common over-the-counter options).",
    "Do not diagnose new conditions, prescribe or change prescription medications, or give advice that would replace an in-person evaluation. For anything urgent, decisions about prescription changes, or symptoms that could be serious, recommend they contact their care team — but still answer the question first.",
    "",
    "You have these tools available. Call them by responding with EXACTLY one JSON object, no prose, no markdown fences:",
    '  { "tool": "<tool_name>", "args": { ... } }',
    "When you have enough information to answer the user, respond with EXACTLY:",
    '  { "answer": "<your reply>" }',
    "",
    "Tools:",
    toolList,
    "",
    "Rules:",
    "- Output ONLY the JSON object, nothing else — no prefix, no suffix, no code fences.",
    "- If the user's question needs data, call the appropriate tool first.",
    '- Omit "instance" unless the user specifies a particular hostname.',
    "- After receiving a tool result, decide whether to call another tool or return the final answer.",
  ].join("\n");
}

export type StreamCallbacks = {
  onText: (text: string) => void;
  onToolCall: (toolCall: ToolCall) => void;
  onDone: (fullText: string, toolCalls: ToolCall[]) => void;
  onError: (error: Error) => void;
};

export type ToolExecutor = (toolName: string, input: Record<string, unknown>) => Promise<string>;

const MAX_ITERATIONS = 8;

function tryExtractJson(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  // Strip markdown fences if present
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  // Find the first {...} block
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

type CompleteFn = (messages: ChatMessage[], system: string, model: string) => Promise<string>;

function backendCompleter(token: string): CompleteFn {
  return async (messages, system, model) => {
    const res = await fetch(backendUrl("/api/ai"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages, system, model }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Backend AI error ${res.status}: ${body}`);
    }
    const data = await res.json();
    return data.content as string;
  };
}

function anthropicCompleter(apiKey: string): CompleteFn {
  return async (messages, system, model) => {
    // BYO-key fallback still uses the same JSON-schema protocol so the
    // surrounding tool loop stays provider-agnostic.
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Anthropic error ${res.status}: ${body}`);
    }
    const data = await res.json();
    const textBlock = (data.content ?? []).find((b: { type: string }) => b.type === "text");
    return (textBlock?.text as string) ?? "";
  };
}

export async function sendMessage(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  executeLocalTool: ToolExecutor,
): Promise<void> {
  const session = await getBackendSession();
  const byoKey = session ? null : await getClaudeApiKey();
  if (!session && !byoKey) {
    callbacks.onError(
      new Error("Not signed in. Sign in with Google to use the included AI credit."),
    );
    return;
  }

  const selectedModel = await getSelectedModel();
  const model = byoKey && selectedModel.startsWith("gemini") ? "claude-sonnet-4-6" : selectedModel;
  const system = buildSystemPrompt();
  const complete: CompleteFn = session
    ? backendCompleter(session.token)
    : anthropicCompleter(byoKey!);

  const conversation: ChatMessage[] = [...messages];
  const toolCalls: ToolCall[] = [];
  let lastAnswer = "";

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let content: string;
    try {
      content = await complete(conversation, system, model);
    } catch (err) {
      callbacks.onError(err as Error);
      return;
    }

    const parsed = tryExtractJson(content);

    if (parsed && typeof parsed.tool === "string") {
      const name = parsed.tool;
      const input = (parsed.args as Record<string, unknown>) ?? {};
      const tc: ToolCall = { id: `tc_${Date.now()}_${i}`, name, input };
      toolCalls.push(tc);
      callbacks.onToolCall(tc);

      // Record the assistant turn (raw JSON), then the tool result as the next user turn.
      conversation.push({ role: "assistant", content });
      let toolResult: string;
      try {
        toolResult = await executeLocalTool(name, input);
      } catch (err) {
        toolResult = `Error: ${(err as Error).message}`;
      }
      conversation.push({
        role: "user",
        content: `Tool result for ${name}:\n${toolResult}`,
      });
      continue;
    }

    // Final answer path: either the model returned {"answer": "..."} or free-form text.
    lastAnswer =
      parsed && typeof parsed.answer === "string" ? (parsed.answer as string) : content;
    callbacks.onText(lastAnswer);
    callbacks.onDone(lastAnswer, toolCalls);
    return;
  }

  callbacks.onError(new Error("AI exceeded tool-use iteration limit."));
}
