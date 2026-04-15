import { fetchWithCek, postWithCek } from "@/lib/client-encryption-key";

export type AddInstanceResult =
  | { ok: true }
  | { ok: false; error: string };

export async function addInstanceApi(
  hostname: string,
  username: string,
  password: string,
): Promise<AddInstanceResult> {
  const res = await postWithCek("/api/mychart-instances", { hostname, username, password });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error || "Failed to add instance." };
  }
  return { ok: true };
}

export type ConnectResult =
  | { state: "logged_in"; sessionKey: string }
  | { state: "need_2fa"; sessionKey: string; twoFaDelivery?: { method: string; contact?: string } }
  | { state: "invalid_login" }
  | { state: "error"; error?: string };

export async function connectInstanceApi(instanceId: string): Promise<ConnectResult> {
  const res = await fetchWithCek(`/api/mychart-instances/${instanceId}/connect`, {
    method: "POST",
  });
  return res.json();
}

export type TwofaResult =
  | { state: "logged_in"; sessionKey: string; instanceId?: string; offerTotpSetup?: boolean }
  | { state: "invalid_2fa" }
  | { state: "error"; error?: string };

export async function submit2faApi(sessionKey: string, code: string): Promise<TwofaResult> {
  const res = await postWithCek("/api/twofa", { sessionKey, code });
  return res.json();
}

export async function deleteInstanceApi(id: string): Promise<void> {
  await fetch(`/api/mychart-instances/${id}`, { method: "DELETE" });
}

export async function toggleInstanceApi(
  id: string,
  enabled: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const res = await postWithCek(`/api/mychart-instances/${id}`, { enabled }, { method: "PATCH" });
  if (!res.ok) {
    const data = await res.json();
    return { ok: false, error: data.error || "Failed to update instance." };
  }
  return { ok: true };
}
