import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChatBubble, ToolCallIndicator } from "@/components/ChatBubble";
import { ChatInput } from "@/components/ChatInput";
import { LeftDrawer } from "@/components/LeftDrawer";
import { sendMessage, type ChatMessage } from "@/lib/ai/claude-client";
import { executeLocalTool } from "@/lib/ai/tool-executor";
import { generateChatTitle } from "@/lib/ai/title-generator";
import {
  getMessages,
  getChat,
  updateChatTitle,
  addMessage,
  type Message,
} from "@/lib/storage/database";

type DisplayMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
};

export default function ChatDetailScreen() {
  const router = useRouter();
  const { id: chatId } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const titleSetRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (chatId) {
      loadMessages();
      getChat(chatId).then((c) => {
        titleSetRef.current = !!c && c.title !== "New Chat";
      });
    }
  }, [chatId]);

  async function loadMessages() {
    const dbMessages = await getMessages(chatId!);
    setMessages(
      dbMessages
        .filter((m): m is Message & { role: "user" | "assistant" } =>
          m.role === "user" || m.role === "assistant"
        )
        .map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        }))
    );
  }

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  async function handleSend(text: string) {
    const userMsg: DisplayMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    await addMessage(chatId!, "user", text);
    scrollToBottom();

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", isStreaming: true },
    ]);
    setIsStreaming(true);
    scrollToBottom();

    const conversationMessages: ChatMessage[] = messages
      .filter((m) => !m.isStreaming)
      .map((m) => ({ role: m.role, content: m.content }));
    conversationMessages.push({ role: "user", content: text });

    let fullText = "";

    await sendMessage(
      conversationMessages,
      {
        onText: (chunk) => {
          fullText += chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m))
          );
          scrollToBottom();
        },
        onToolCall: (tc) => setActiveTool(tc.name),
        onDone: async (finalText) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: finalText, isStreaming: false } : m
            )
          );
          setIsStreaming(false);
          setActiveTool(null);
          await addMessage(chatId!, "assistant", finalText);

          if (!titleSetRef.current) {
            const transcript: ChatMessage[] = [
              ...messages
                .filter((m) => !m.isStreaming)
                .map((m) => ({ role: m.role, content: m.content })),
              { role: "user", content: text },
              { role: "assistant", content: finalText },
            ];
            const aiTitle = await generateChatTitle(transcript);
            if (aiTitle) {
              titleSetRef.current = true;
              await updateChatTitle(chatId!, aiTitle);
            }
          }
        },
        onError: (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: `Error: ${err.message}`, isStreaming: false }
                : m
            )
          );
          setIsStreaming(false);
          setActiveTool(null);
        },
      },
      executeLocalTool
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Open menu"
            testID="open-drawer"
            onPress={() => setDrawerOpen(true)}
            hitSlop={10}
          >
            <Text style={styles.menuIcon}>≡</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Chat</Text>
          <Pressable onPress={() => router.replace("/(auth)")} hitSlop={10}>
            <Text style={styles.newChat}>New</Text>
          </Pressable>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatBubble
              role={item.role}
              content={item.content}
              isStreaming={item.isStreaming}
            />
          )}
          contentContainerStyle={styles.messageList}
          ListFooterComponent={
            activeTool ? <ToolCallIndicator toolName={activeTool} /> : null
          }
        />
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </KeyboardAvoidingView>

      <LeftDrawer
        visible={drawerOpen}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
        currentChatId={chatId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  menuIcon: {
    fontSize: 26,
    color: "#000",
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  newChat: {
    fontSize: 15,
    color: "#007AFF",
    fontWeight: "500",
    width: 40,
    textAlign: "right",
  },
  messageList: {
    paddingVertical: 12,
  },
});
