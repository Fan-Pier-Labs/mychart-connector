import { oneShotComplete, type ChatMessage } from "./claude-client";

const SYSTEM_PROMPT = `You name chat conversations.

Look at the conversation so far and decide if it has enough substance to give it a short, descriptive title.

Reply with EXACTLY one line:
- A 3-6 word title in Title Case if the topic is clear (e.g. "Refill Lisinopril Question", "MRI Results Review")
- The literal word SKIP if the conversation is too short, too vague, or just pleasantries (e.g. "hi", "hello there", "thanks")

Do not include quotes, punctuation, explanations, or any other text. Title only or SKIP only.`;

const MAX_TITLE_WORDS = 8;

/**
 * Inspect a conversation and return an AI-generated title, or null if
 * the model decided the chat is still too vague to title.
 */
export async function generateChatTitle(messages: ChatMessage[]): Promise<string | null> {
  if (messages.length === 0) return null;

  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 600)}`)
    .join("\n\n");

  const userMsg: ChatMessage = {
    role: "user",
    content: `Conversation:\n\n${transcript}`,
  };

  let raw: string;
  try {
    raw = await oneShotComplete([userMsg], SYSTEM_PROMPT, "mini");
  } catch {
    return null;
  }

  const cleaned = raw.trim().replace(/^["'`]+|["'`]+$/g, "").trim();
  if (!cleaned) return null;
  if (/^skip$/i.test(cleaned)) return null;

  const firstLine = cleaned.split("\n")[0].trim();
  const words = firstLine.split(/\s+/).slice(0, MAX_TITLE_WORDS);
  const title = words.join(" ").replace(/[.!?]+$/, "");
  if (!title || /^skip$/i.test(title)) return null;
  return title;
}
