import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import Markdown from "react-native-markdown-display";

type Props = {
  summaryMd: string | null;
  generatedAt: string | null;
  refreshing: boolean;
  onRefresh: () => void;
};

export function MemorySummaryCard({ summaryMd, generatedAt, refreshing, onRefresh }: Props) {
  const [expanded, setExpanded] = useState(false);
  const subtitle = generatedAt
    ? `Updated ${formatRelative(generatedAt)}`
    : "No digest yet";

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={() => setExpanded((v) => !v)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Health Digest</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.chevron}>{expanded ? "▾" : "▸"}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          {summaryMd ? (
            <Markdown
              style={{
                body: { color: "#1a1a1a", fontSize: 14, lineHeight: 20 },
                heading2: { fontSize: 16, fontWeight: "600", marginTop: 8 },
                bullet_list: { marginLeft: 4 },
              }}
            >
              {summaryMd}
            </Markdown>
          ) : (
            <Text style={styles.empty}>
              The first time you connect MyChart, your data is digested in the background. This usually takes under a minute.
            </Text>
          )}

          <Pressable
            style={[styles.refreshButton, refreshing && styles.refreshButtonDisabled]}
            onPress={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.refreshButtonText}>Refresh</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "recently";
  const diffMs = Date.now() - d.getTime();
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return d.toLocaleDateString();
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 14,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  title: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  subtitle: { fontSize: 12, color: "#666", marginTop: 2 },
  chevron: { fontSize: 16, color: "#999", marginLeft: 8 },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
  },
  empty: { fontSize: 14, color: "#666", marginTop: 12, lineHeight: 20 },
  refreshButton: {
    backgroundColor: "#000",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 12,
  },
  refreshButtonDisabled: { opacity: 0.6 },
  refreshButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
