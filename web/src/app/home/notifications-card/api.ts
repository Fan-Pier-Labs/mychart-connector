export type NotifPrefs = {
  enabled: boolean;
  includeContent: boolean;
};

export async function fetchNotifPrefs(): Promise<NotifPrefs | null> {
  const res = await fetch("/api/notifications/preferences");
  const data = await res.json();
  if (typeof data.enabled === "boolean" && typeof data.includeContent === "boolean") {
    return { enabled: data.enabled, includeContent: data.includeContent };
  }
  return null;
}

export async function updateNotifPrefs(
  enabled: boolean,
  includeContent: boolean,
): Promise<{ ok: true; prefs: NotifPrefs } | { ok: false; error: string }> {
  const res = await fetch("/api/notifications/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled, includeContent }),
  });
  const data = await res.json();
  if (res.ok) {
    return { ok: true, prefs: { enabled: data.enabled, includeContent: data.includeContent } };
  }
  return { ok: false, error: data.error || "Failed to update preferences." };
}
