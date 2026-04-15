import { useState, useRef } from "react";
import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder="Ask about your health data..."
        placeholderTextColor="#999"
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleSend}
        multiline
        maxLength={10000}
        editable={!disabled}
      />
      <Pressable
        style={[styles.sendButton, (!text.trim() || disabled) && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={!text.trim() || disabled}
      >
        <Text style={[styles.sendText, (!text.trim() || disabled) && styles.sendTextDisabled]}>
          Send
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: "#1a1a1a",
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: "#000",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
  },
  sendText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  sendTextDisabled: {
    color: "#999",
  },
});
