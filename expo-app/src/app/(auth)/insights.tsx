import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  getMemorySummary,
  listInsights,
  setInsightStatus,
  type InsightRow,
  type MemorySummaryRow,
} from "@/lib/storage/database";
import { getMyChartAccounts } from "@/lib/storage/secure-store";
import { refreshMemory, buildInitialMemory } from "@/lib/memory/builder";
import { InsightCard } from "@/components/InsightCard";
import { MemorySummaryCard } from "@/components/MemorySummaryCard";

export default function InsightsScreen() {
  const router = useRouter();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [summary, setSummary] = useState<MemorySummaryRow | null>(null);
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const accounts = await getMyChartAccounts();
    const id = accounts[0]?.id ?? null;
    setAccountId(id);
    if (!id) {
      setSummary(null);
      setInsights([]);
      return;
    }
    const [sum, ins] = await Promise.all([
      getMemorySummary(id),
      listInsights(id, "active"),
    ]);
    setSummary(sum);
    setInsights(ins);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleRefresh() {
    if (!accountId) return;
    setRefreshing(true);
    try {
      if (!summary) {
        await buildInitialMemory(accountId);
      } else {
        const result = await refreshMemory(accountId);
        if (!result.updated) {
          Alert.alert("Up to date", "No new MyChart records since the last refresh.");
        }
      }
      await load();
    } catch (err) {
      Alert.alert("Refresh failed", (err as Error).message);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleAsk(question: string) {
    router.push({ pathname: "/(auth)", params: { ask: question } });
  }

  async function handleDismiss(insight: InsightRow) {
    await setInsightStatus(insight.id, "dismissed");
    setInsights((prev) => prev.filter((i) => i.id !== insight.id));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Insights</Text>
        <View style={styles.backSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {!accountId ? (
          <Text style={styles.empty}>
            Connect a MyChart account in Settings to see your health digest and AI insights.
          </Text>
        ) : (
          <>
            <MemorySummaryCard
              summaryMd={summary?.summary_md ?? null}
              generatedAt={summary?.generated_at ?? null}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />

            <Text style={styles.sectionTitle}>
              Patterns to consider ({insights.length})
            </Text>

            {insights.length === 0 ? (
              <Text style={styles.empty}>
                {summary
                  ? "Nothing flagged in your records right now. Pull to refresh after new visits or labs."
                  : "Your first health digest is being built. Pull back in a minute."}
              </Text>
            ) : (
              insights.map((ins) => (
                <InsightCard
                  key={ins.id}
                  insight={ins}
                  expanded={expandedId === ins.id}
                  onToggle={() =>
                    setExpandedId((curr) => (curr === ins.id ? null : ins.id))
                  }
                  onAsk={handleAsk}
                  onDismiss={() => handleDismiss(ins)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          AI-generated suggestions based on your records. Not medical advice. Always discuss with your doctor.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#000" },
  back: { fontSize: 15, color: "#007AFF", fontWeight: "500", minWidth: 60 },
  backSpacer: { minWidth: 60 },
  scroll: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },
  empty: { fontSize: 14, color: "#666", lineHeight: 20, marginTop: 8 },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  footerText: { fontSize: 11, color: "#888", textAlign: "center", lineHeight: 15 },
});
