import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import {
  getAiProvider,
  setAiProvider,
  getClaudeApiKey,
  setClaudeApiKey,
  getOpenAiApiKey,
  setOpenAiApiKey,
  getGeminiApiKey,
  setGeminiApiKey,
  type AiProvider,
} from "@/lib/storage/secure-store";
import { getBackendSession } from "@/lib/backend/session";

type ProviderOption = {
  id: AiProvider;
  title: string;
  description: string;
};

const OPTIONS: ProviderOption[] = [
  { id: "free", title: "Free tier (our server)", description: "Uses the $50/month of included AI credit via Google sign-in. No API key needed." },
  { id: "openai", title: "OpenAI API key", description: "Your own OpenAI key (gpt-4o). Calls go directly to OpenAI." },
  { id: "anthropic", title: "Anthropic API key", description: "Your own Anthropic key (Claude Sonnet 4.6). Calls go directly to Anthropic." },
  { id: "gemini", title: "Gemini API key", description: "Your own Google Gemini key (2.5 Flash). Calls go directly to Google." },
];

export default function AiSettings() {
  const router = useRouter();
  const [provider, setProvider] = useState<AiProvider>("free");
  const [openaiKey, setOpenaiKeyLocal] = useState("");
  const [anthropicKey, setAnthropicKeyLocal] = useState("");
  const [geminiKey, setGeminiKeyLocal] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const [show, setShow] = useState<Record<string, boolean>>({});

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setProvider(await getAiProvider());
        setOpenaiKeyLocal((await getOpenAiApiKey()) || "");
        setAnthropicKeyLocal((await getClaudeApiKey()) || "");
        setGeminiKeyLocal((await getGeminiApiKey()) || "");
        setHasSession(!!(await getBackendSession()));
      })();
    }, []),
  );

  async function handlePick(p: AiProvider) {
    if (p === "free" && !hasSession) {
      Alert.alert("Sign in required", "Sign in with Google from the Settings screen to use the free tier.");
      return;
    }
    setProvider(p);
    await setAiProvider(p);
  }

  async function handleSaveKey(p: "openai" | "anthropic" | "gemini") {
    if (p === "openai") await setOpenAiApiKey(openaiKey);
    else if (p === "anthropic") await setClaudeApiKey(anthropicKey);
    else await setGeminiApiKey(geminiKey);
    Alert.alert("Saved", "API key updated.");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Settings</Text>
        </Pressable>
        <Text style={styles.headerTitle}>AI Provider</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        {OPTIONS.map((opt) => {
          const selected = provider === opt.id;
          return (
            <View key={opt.id} style={styles.section}>
              <Pressable style={styles.row} onPress={() => handlePick(opt.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optTitle}>{opt.title}</Text>
                  <Text style={styles.optDesc}>{opt.description}</Text>
                </View>
                <View style={[styles.radio, selected && styles.radioOn]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
              </Pressable>

              {opt.id !== "free" && (
                <View style={styles.keyRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder={
                      opt.id === "openai"
                        ? "sk-..."
                        : opt.id === "anthropic"
                          ? "sk-ant-..."
                          : "AIza..."
                    }
                    placeholderTextColor="#999"
                    value={opt.id === "openai" ? openaiKey : opt.id === "anthropic" ? anthropicKey : geminiKey}
                    onChangeText={
                      opt.id === "openai"
                        ? setOpenaiKeyLocal
                        : opt.id === "anthropic"
                          ? setAnthropicKeyLocal
                          : setGeminiKeyLocal
                    }
                    secureTextEntry={!show[opt.id]}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable
                    style={styles.eye}
                    onPress={() => setShow((s) => ({ ...s, [opt.id]: !s[opt.id] }))}
                  >
                    <Text style={{ color: "#007AFF" }}>{show[opt.id] ? "Hide" : "Show"}</Text>
                  </Pressable>
                  <Pressable style={styles.save} onPress={() => handleSaveKey(opt.id as "openai" | "anthropic" | "gemini")}>
                    <Text style={styles.saveText}>Save</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scroll: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  back: { color: "#007AFF", fontSize: 16, width: 80 },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  optTitle: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  optDesc: { fontSize: 13, color: "#666", marginTop: 2, lineHeight: 18 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  radioOn: { borderColor: "#007AFF" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#007AFF" },
  keyRow: { flexDirection: "row", gap: 8, marginTop: 10, alignItems: "center" },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  eye: { paddingHorizontal: 6, paddingVertical: 10 },
  save: {
    backgroundColor: "#000",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
