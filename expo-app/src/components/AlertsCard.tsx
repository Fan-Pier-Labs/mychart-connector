import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert as RNAlert, Linking } from "react-native";
import { getActiveAlerts, dismissAlert, type Alert } from "@/lib/storage/database";
import { regenerateAlerts } from "@/lib/alerts/generator";
import { executeScraperTool } from "@/lib/scrapers/session-manager";

type Props = {
  onDoAlert: (prompt: string) => void;
};

export function AlertsCard({ onDoAlert }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const rows = await getActiveAlerts();
    setAlerts(rows);
  }, []);

  useEffect(() => {
    refresh();
    regenerateAlerts()
      .then(() => refresh())
      .catch((err) => console.warn("[alerts] regenerate failed:", err.message));
  }, [refresh]);

  if (alerts.length === 0) return null;

  async function handleIgnore(id: string) {
    await dismissAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleDo(alert: Alert) {
    const payload = safeJson<Record<string, unknown>>(alert.action_payload, {});
    if (alert.action_kind === "open_url") {
      const url = payload.url as string | undefined;
      if (!url) return;
      await Linking.openURL(url);
      return;
    }
    if (alert.action_kind === "request_refill") {
      const medName = payload.medication_name as string;
      const instance = payload.instance as string | undefined;
      RNAlert.alert(
        "Request refill?",
        `Send a refill request for ${alert.title}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Request",
            style: "default",
            onPress: async () => {
              setBusyId(alert.id);
              try {
                const result = (await executeScraperTool("request_refill", {
                  medication_name: medName,
                  ...(instance ? { instance } : {}),
                })) as { success?: boolean; error?: string };
                if (result?.error) {
                  RNAlert.alert("Refill failed", result.error);
                } else {
                  RNAlert.alert("Refill requested", `${alert.title} refill request sent.`);
                  await dismissAlert(alert.id);
                  setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
                }
              } catch (err) {
                RNAlert.alert("Refill failed", (err as Error).message);
              } finally {
                setBusyId(null);
              }
            },
          },
        ],
      );
      return;
    }
    // ai_chat
    const prompt = (payload.prompt as string) ?? alert.description;
    onDoAlert(prompt);
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.header}
        accessibilityLabel="Toggle alerts list"
        testID="alerts-toggle"
      >
        <View style={styles.headerLeft}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{alerts.length}</Text>
          </View>
          <Text style={styles.headerTitle}>
            {alerts.length === 1 ? "1 thing to review" : `${alerts.length} things to review`}
          </Text>
        </View>
        <Text style={styles.chevron}>{expanded ? "▾" : "▸"}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.list}>
          {alerts.map((a) => {
            const ctaLabel = a.uses_ai ? `${a.cta_label} with AI` : a.cta_label;
            const isBusy = busyId === a.id;
            return (
              <View key={a.id} style={styles.item}>
                <Text style={styles.itemTitle}>{a.title}</Text>
                <Text style={styles.itemDesc}>{a.description}</Text>
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => handleDo(a)}
                    disabled={isBusy}
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnPrimary,
                      pressed && styles.btnPressed,
                      isBusy && styles.btnDisabled,
                    ]}
                    testID={`alert-do-${a.dedup_key}`}
                  >
                    <Text style={styles.btnPrimaryText}>{isBusy ? "Sending…" : ctaLabel}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleIgnore(a.id)}
                    disabled={isBusy}
                    style={({ pressed }) => [styles.btn, styles.btnSecondary, pressed && styles.btnPressed]}
                    testID={`alert-ignore-${a.dedup_key}`}
                  >
                    <Text style={styles.btnSecondaryText}>Ignore</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function safeJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  chevron: {
    fontSize: 16,
    color: "#666",
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  item: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: 13,
    color: "#555",
    marginBottom: 10,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: {
    opacity: 0.6,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnPrimary: {
    backgroundColor: "#007AFF",
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  btnSecondary: {
    backgroundColor: "#f1f1f1",
  },
  btnSecondaryText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "500",
  },
});
