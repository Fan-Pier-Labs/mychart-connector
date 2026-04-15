import Constants from "expo-constants";
import { getBackendSession } from "./session";

function getBackendUrl(): string {
  const url = (Constants.expoConfig?.extra as { backendUrl?: string } | undefined)?.backendUrl;
  if (!url) throw new Error("backendUrl not configured in app.config.ts");
  return url.replace(/\/$/, "");
}

export async function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const session = await getBackendSession();
  const headers = new Headers(init.headers);
  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Origin")) {
    headers.set("Origin", "openrecord://");
  }
  return fetch(`${getBackendUrl()}${path}`, {
    credentials: "omit",
    ...init,
    headers,
  });
}

export function backendUrl(path = ""): string {
  return `${getBackendUrl()}${path}`;
}
