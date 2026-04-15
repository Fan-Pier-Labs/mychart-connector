import { View, Text, StyleSheet, Image } from "react-native";
import Markdown from "react-native-markdown-display";
import { getImageAttachment, extractImageIds } from "@/lib/imaging/attachment-store";

type Props = {
  role: "user" | "assistant" | "system";
  content: string;
  isStreaming?: boolean;
};

export function ChatBubble({ role, content, isStreaming }: Props) {
  const isUser = role === "user";
  const imageIds = !isUser ? extractImageIds(content) : [];
  const displayContent = imageIds.length
    ? content.replace(/\[image:[a-zA-Z0-9_-]+\]\s*/g, "").trim()
    : content;

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {isUser ? (
          <Text style={styles.userText}>{content}</Text>
        ) : (
          <Markdown
            style={{
              body: { color: "#1a1a1a", fontSize: 15, lineHeight: 22 },
              code_inline: { backgroundColor: "#f0f0f0", paddingHorizontal: 4, borderRadius: 3, fontSize: 13 },
              code_block: { backgroundColor: "#f0f0f0", padding: 10, borderRadius: 6, fontSize: 13 },
              heading1: { fontSize: 20, fontWeight: "700", marginTop: 8 },
              heading2: { fontSize: 18, fontWeight: "600", marginTop: 6 },
              heading3: { fontSize: 16, fontWeight: "600", marginTop: 4 },
              bullet_list: { marginLeft: 4 },
              ordered_list: { marginLeft: 4 },
              table: { borderWidth: 1, borderColor: "#ddd" },
              th: { padding: 6, fontWeight: "600", backgroundColor: "#f5f5f5" },
              td: { padding: 6 },
            }}
          >
            {displayContent || (isStreaming ? "..." : "")}
          </Markdown>
        )}
        {imageIds.map((id) => {
          const att = getImageAttachment(id);
          if (!att) return null;
          const aspect = att.width > 0 && att.height > 0 ? att.width / att.height : 1;
          return (
            <View key={id} style={styles.attachment}>
              <Image
                source={{ uri: att.dataUri }}
                style={[styles.attachmentImage, { aspectRatio: aspect }]}
                resizeMode="contain"
              />
              {att.caption ? <Text style={styles.attachmentCaption}>{att.caption}</Text> : null}
            </View>
          );
        })}
        {isStreaming && content ? <View style={styles.cursor} /> : null}
      </View>
    </View>
  );
}

export function ToolCallIndicator({ toolName }: { toolName: string }) {
  const friendlyName = toolName.replace(/_/g, " ").replace(/^get /, "Fetching ");
  return (
    <View style={styles.toolCallContainer}>
      <Text style={styles.toolCallText}>Using tool: {friendlyName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  userContainer: {
    alignItems: "flex-end",
  },
  assistantContainer: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "85%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: "#000",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: "#f0f0f0",
    borderBottomLeftRadius: 4,
  },
  userText: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 22,
  },
  cursor: {
    width: 2,
    height: 16,
    backgroundColor: "#000",
    marginTop: 4,
    opacity: 0.6,
  },
  attachment: {
    marginTop: 8,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  attachmentImage: {
    width: "100%",
    backgroundColor: "#000",
  },
  attachmentCaption: {
    fontSize: 12,
    color: "#ccc",
    padding: 6,
    backgroundColor: "#000",
  },
  toolCallContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  toolCallText: {
    fontSize: 13,
    color: "#666",
    fontStyle: "italic",
  },
});
