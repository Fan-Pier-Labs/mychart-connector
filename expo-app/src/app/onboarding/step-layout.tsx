import { type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./styles";

/**
 * Shared chrome for the centered, single-column onboarding steps
 * (welcome, google, mychart, twofa, passkey). The picker step has a
 * different layout — it manages its own SafeAreaView.
 */
export function StepLayout({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
