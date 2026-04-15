import { useState, useRef, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChatBubble, ToolCallIndicator } from "@/components/ChatBubble";
import { ChatInput } from "@/components/ChatInput";
import { LeftDrawer } from "@/components/LeftDrawer";
import { sendMessage, type ChatMessage, type ToolCall } from "@/lib/ai/claude-client";
import { executeLocalTool } from "@/lib/ai/tool-executor";
import { generateChatTitle } from "@/lib/ai/title-generator";
import {
  createChat,
  addMessage,
  updateChatTitle,
} from "@/lib/storage/database";

type DisplayMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  toolCalls?: ToolCall[];
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const titleSetRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  async function handleSend(text: string) {
    let currentChatId = chatId;
    if (!currentChatId) {
      const chat = await createChat("New Chat");
      currentChatId = chat.id;
      setChatId(currentChatId);
    }

    const userMsg: DisplayMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    await addMessage(currentChatId, "user", text);
    scrollToBottom();

    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: DisplayMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMsg]);
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
        onToolCall: (tc) => {
          setActiveTool(tc.name);
        },
        onDone: async (finalText) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: finalText, isStreaming: false } : m
            )
          );
          setIsStreaming(false);
          setActiveTool(null);

          await addMessage(currentChatId!, "assistant", finalText);

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
              await updateChatTitle(currentChatId!, aiTitle);
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

  function handleNewChat() {
    setMessages([]);
    setChatId(null);
    setActiveTool(null);
    titleSetRef.current = false;
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
          <Text style={styles.headerTitle}>OpenRecord</Text>
          <Pressable onPress={handleNewChat} hitSlop={10}>
            <Text style={styles.newChat}>New</Text>
          </Pressable>
        </View>

        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>OpenRecord</Text>
            <Text style={styles.emptySubtitle}>Ask anything about your health data</Text>
          </View>
        ) : (
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
        )}

        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </KeyboardAvoidingView>

      <LeftDrawer
        visible={drawerOpen}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
        currentChatId={chatId}
        onNewChat={handleNewChat}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
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
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  messageList: {
    paddingVertical: 12,
  },
});
