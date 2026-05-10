import { View, Text, Pressable, StyleSheet } from "react-native";
import Markdown from "react-native-markdown-display";
import type { InsightRow } from "@/lib/storage/database";

type Props = {
  insight: InsightRow;
  expanded: boolean;
  onToggle: () => void;
  onAsk: (question: string) => void;
  onDismiss: () => void;
};

const SEVERITY_LABEL: Record<InsightRow["severity"], string> = {
  info: "Info",
  discuss: "Discuss",
  discuss_soon: "Discuss soon",
};

const SEVERITY_COLOR: Record<InsightRow["severity"], { bg: string; fg: string }> = {
  info: { bg: "#eef3ff", fg: "#1d4ed8" },
  discuss: { bg: "#fff4e5", fg: "#a8580a" },
  discuss_soon: { bg: "#fde7e7", fg: "#b3261e" },
};

export function InsightCard({ insight, expanded, onToggle, onAsk, onDismiss }: Props) {
  const sev = SEVERITY_COLOR[insight.severity];
  return (
    <View style={styles.card}>
      <Pressable onPress={onToggle} style={styles.header} hitSlop={4}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{insight.title}</Text>
          <View style={[styles.badge, { backgroundColor: sev.bg }]}>
            <Text style={[styles.badgeText, { color: sev.fg }]}>{SEVERITY_LABEL[insight.severity]}</Text>
          </View>
        </View>
        <Text style={styles.chevron}>{expanded ? "▾" : "▸"}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          <Markdown
            style={{
              body: { color: "#1a1a1a", fontSize: 14, lineHeight: 20 },
              heading2: { fontSize: 15, fontWeight: "600", marginTop: 6 },
              bullet_list: { marginLeft: 4 },
            }}
          >
            {insight.body_md}
          </Markdown>

          {insight.suggested_question ? (
            <View style={styles.questionBox}>
              <Text style={styles.questionLabel}>Suggested question</Text>
              <Text style={styles.questionText}>“{insight.suggested_question}”</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            {insight.suggested_question ? (
              <Pressable style={styles.askButton} onPress={() => onAsk(insight.suggested_question!)}>
                <Text style={styles.askButtonText}>Ask in chat</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.dismissButton} onPress={onDismiss}>
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 10,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerText: { flex: 1 },
  title: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  badge: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  chevron: { fontSize: 16, color: "#999", marginLeft: 8 },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
  },
  questionBox: {
    marginTop: 10,
    backgroundColor: "#f7f7f9",
    borderRadius: 8,
    padding: 10,
  },
  questionLabel: { fontSize: 11, color: "#666", textTransform: "uppercase", marginBottom: 4 },
  questionText: { fontSize: 14, color: "#1a1a1a", fontStyle: "italic" },
  actions: { flexDirection: "row", marginTop: 12, gap: 8 },
  askButton: {
    backgroundColor: "#000",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  askButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  dismissButton: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  dismissButtonText: { color: "#444", fontSize: 14, fontWeight: "500" },
});
