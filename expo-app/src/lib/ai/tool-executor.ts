/**
 * Local tool executor — runs MyChart scrapers on-device.
 *
 * Read-only scrapers run immediately. Write tools (send_message,
 * send_reply, request_refill, …) require a user confirmation popup
 * showing the exact payload before they execute, similar to the
 * Claude mobile app.
 */
import { Alert } from "react-native";
import { executeScraperTool as sessionExecute } from "@/lib/scrapers/session-manager";

const WRITE_TOOLS: Record<string, { title: string; description: string }> = {
  send_message: {
    title: "Send Message",
    description: "Sends a new message to a MyChart provider.",
  },
  send_reply: {
    title: "Send Reply",
    description: "Replies to an existing MyChart conversation.",
  },
  request_refill: {
    title: "Request Refill",
    description: "Submits a medication refill request to MyChart.",
  },
};

function formatArgs(input: Record<string, unknown>): string {
  const entries = Object.entries(input).filter(([k]) => k !== "instance");
  if (entries.length === 0) return "(no arguments)";
  return entries
    .map(([k, v]) => {
      const val = typeof v === "string" ? v : JSON.stringify(v);
      return `${k}:\n${val}`;
    })
    .join("\n\n");
}

function confirmWrite(
  toolName: string,
  input: Record<string, unknown>,
): Promise<boolean> {
  const meta = WRITE_TOOLS[toolName];
  if (!meta) return Promise.resolve(true);
  const body = `${meta.description}\n\n${formatArgs(input)}`;
  return new Promise((resolve) => {
    Alert.alert(
      `Confirm: ${meta.title}`,
      body,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Send", style: "destructive", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export async function executeLocalTool(
  toolName: string,
  input: Record<string, unknown>,
): Promise<string> {
  try {
    if (WRITE_TOOLS[toolName]) {
      const ok = await confirmWrite(toolName, input);
      if (!ok) {
        return JSON.stringify({
          cancelled: true,
          message: `User declined to run ${toolName}. Do not retry unless they ask again.`,
        });
      }
    }
    const result = await sessionExecute(toolName, input);
    return JSON.stringify(result, null, 2);
  } catch (err) {
    return JSON.stringify({
      error: `Failed to execute ${toolName}: ${(err as Error).message}`,
    });
  }
}
