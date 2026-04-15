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

import {
  getClaudeApiKey,
  getOpenAiApiKey,
  getGeminiApiKey,
  getAiProvider,
} from "@/lib/storage/secure-store";
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
  { name: "get_xray_image", description: "Download the actual X-ray/imaging picture for an imaging result and attach it to the reply. Use the 0-based index from get_imaging_results.", args: { instance: "optional", imaging_index: "0-based index from get_imaging_results" } },
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
    "Handling common requests:",
    "- Insurance / billing updates, payment plans, charge questions: you CAN help by sending a message to the billing department. Call get_message_recipients to list available recipients, pick the one that looks like billing (e.g. 'Billing', 'Billing Department', 'Customer Service', 'Patient Accounts'), then draft a send_message and confirm with the user before sending.",
    "- Booking / scheduling / rescheduling / cancelling appointments: you CAN help by messaging the right provider. First call get_care_team (and if needed get_message_recipients) to find candidate providers. If the user already named a specialty or doctor, pick that one; otherwise ask the user which provider they want to see. Then draft a send_message to that provider describing what they're asking for (visit type, preferred dates/times, reason) and confirm before sending.",
    "- Showing X-ray / imaging pictures: if the user asks to SEE an X-ray (not just the report), call get_imaging_results first to pick the right study, then call get_xray_image with its 0-based index. The tool returns { image_id, caption }. In your final answer, include the literal token [image:IMAGE_ID] on its own line where you want the picture to appear (the UI will swap it for the actual image).",
    "- Prescription refills: use request_refill.",
    "- General questions for a provider: use send_message (look up recipients first if you're unsure of the name).",
    "- Replying to an existing thread: use send_reply with the conversation_id from get_messages.",
    "- For any write action (send_message, send_reply, request_refill), always show the user the exact payload and get explicit confirmation before calling the tool.",
    "",
    "Rules:",
    "- Output ONLY the JSON object, nothing else — no prefix, no suffix, no code fences.",
    "- If the user's question needs data, call the appropriate tool first.",
    '- Omit "instance" unless the user specifies a particular hostname.',
    "- After receiving a tool result, decide whether to call another tool or return the final answer.",
    "- Don't refuse a request just because you don't immediately know how — check the tools above first.",
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

function openaiCompleter(apiKey: string): CompleteFn {
  return async (messages, system, model) => {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI error ${res.status}: ${body}`);
    }
    const data = await res.json();
    return (data.choices?.[0]?.message?.content as string) ?? "";
  };
}

function geminiCompleter(apiKey: string): CompleteFn {
  return async (messages, system, model) => {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { role: "system", parts: [{ text: system }] },
          contents,
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gemini error ${res.status}: ${body}`);
    }
    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    return parts.map((p: { text?: string }) => p.text ?? "").join("");
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

type ResolvedCompleter = { complete: CompleteFn; model: string };

type ModelTier = "default" | "mini";

const MINI_MODELS: Record<string, string> = {
  openai: "gpt-5.4-mini",
  anthropic: "claude-haiku-4-5-20251001",
  gemini: "gemini-2.5-flash-lite",
  free: "gemini-2.5-flash-lite",
};

async function resolveCompleter(tier: ModelTier = "default"): Promise<ResolvedCompleter> {
  const provider = await getAiProvider();
  if (provider === "openai") {
    const key = await getOpenAiApiKey();
    if (!key) throw new Error("OpenAI API key not set. Add it in Settings → AI Provider.");
    const model = tier === "mini" ? MINI_MODELS.openai : "gpt-4o";
    return { complete: openaiCompleter(key), model };
  }
  if (provider === "anthropic") {
    const key = await getClaudeApiKey();
    if (!key) throw new Error("Anthropic API key not set. Add it in Settings → AI Provider.");
    const model = tier === "mini" ? MINI_MODELS.anthropic : "claude-sonnet-4-6";
    return { complete: anthropicCompleter(key), model };
  }
  if (provider === "gemini") {
    const key = await getGeminiApiKey();
    if (!key) throw new Error("Gemini API key not set. Add it in Settings → AI Provider.");
    const model = tier === "mini" ? MINI_MODELS.gemini : "gemini-2.5-flash";
    return { complete: geminiCompleter(key), model };
  }
  const session = await getBackendSession();
  if (!session) {
    throw new Error(
      "Not signed in. Sign in with Google to use the free tier, or add your own API key in Settings → AI Provider.",
    );
  }
  const model = tier === "mini" ? MINI_MODELS.free : "gemini-2.5-flash";
  return { complete: backendCompleter(session.token), model };
}

/**
 * One-shot completion that bypasses the tool-use loop. Used for
 * lightweight side calls like generating chat titles. Pass tier:"mini"
 * to use the cheapest model the active provider offers.
 */
export async function oneShotComplete(
  messages: ChatMessage[],
  system: string,
  tier: ModelTier = "default",
): Promise<string> {
  const { complete, model } = await resolveCompleter(tier);
  return complete(messages, system, model);
}

export async function sendMessage(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  executeLocalTool: ToolExecutor,
): Promise<void> {
  const system = buildSystemPrompt();

  let complete: CompleteFn;
  let model: string;
  try {
    const resolved = await resolveCompleter();
    complete = resolved.complete;
    model = resolved.model;
  } catch (err) {
    callbacks.onError(err as Error);
    return;
  }

  const conversation: ChatMessage[] = [...messages];
  const toolCalls: ToolCall[] = [];
  const pendingImageIds: string[] = [];
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
      // If an image tool returned an image_id, remember it so we can make
      // sure the final answer includes the [image:id] token even when the
      // model forgets to echo it.
      try {
        const parsedResult = JSON.parse(toolResult);
        if (parsedResult && typeof parsedResult.image_id === "string") {
          pendingImageIds.push(parsedResult.image_id);
        }
      } catch {
        /* tool result wasn't JSON */
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
    // Ensure image tokens are present so the UI can render attachments.
    for (const id of pendingImageIds) {
      if (!lastAnswer.includes(`[image:${id}]`)) {
        lastAnswer = `${lastAnswer.trim()}\n\n[image:${id}]`;
      }
    }
    callbacks.onText(lastAnswer);
    callbacks.onDone(lastAnswer, toolCalls);
    return;
  }

  callbacks.onError(new Error("AI exceeded tool-use iteration limit."));
}
