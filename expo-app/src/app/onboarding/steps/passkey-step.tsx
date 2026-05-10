import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { registerPasskey } from "@/lib/scrapers/session-manager";
import { StepLayout } from "../step-layout";
import { styles } from "../styles";

type Props = {
  accountId: string | null;
  onDone: () => void;
};

export function PasskeyStep({ accountId, onDone }: Props) {
  const [registering, setRegistering] = useState(false);

  async function handleRegister() {
    if (!accountId) {
      onDone();
      return;
    }
    setRegistering(true);
    try {
      const ok = await registerPasskey(accountId);
      if (!ok) {
        Alert.alert(
          "Passkey setup failed",
          "We couldn't register a passkey on your MyChart account. You can try again later from Settings.",
          [{ text: "Continue", onPress: onDone }],
        );
        return;
      }
      onDone();
    } catch (err) {
      Alert.alert("Passkey setup failed", (err as Error).message, [
        { text: "Continue", onPress: onDone },
      ]);
    } finally {
      setRegistering(false);
    }
  }

  return (
    <StepLayout>
      <View style={styles.center}>
        <Text style={styles.title}>Skip the password forever</Text>
        <Text style={styles.body}>
          Set up a passkey on your MyChart account so OpenRecord can sign in
          automatically — no password, no 2FA codes.
        </Text>
        <Pressable
          testID="passkey-setup"
          style={[styles.primaryButton, registering && styles.disabled]}
          onPress={handleRegister}
          disabled={registering}
        >
          {registering ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Set up passkey</Text>
          )}
        </Pressable>
        <Pressable
          testID="passkey-skip"
          style={styles.secondaryButton}
          onPress={onDone}
          disabled={registering}
        >
          <Text style={styles.secondaryButtonText}>Skip for now</Text>
        </Pressable>
      </View>
    </StepLayout>
  );
}
