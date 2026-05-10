import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { complete2fa } from "@/lib/scrapers/session-manager";
import { StepLayout } from "../step-layout";
import { styles } from "../styles";

type Props = {
  accountId: string;
  /** Human-readable description of where the code was sent. */
  deliveryLabel: string;
  onLoggedIn: () => void;
};

export function TwoFaStep({ accountId, deliveryLabel, onLoggedIn }: Props) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function handleVerify() {
    if (code.trim().length < 4) {
      Alert.alert(
        "Enter your code",
        "Type the verification code from your inbox or text message.",
      );
      return;
    }
    setVerifying(true);
    try {
      const result = await complete2fa(accountId, code.trim());
      if (result.state === "logged_in") {
        onLoggedIn();
        return;
      }
      if (result.state === "invalid_2fa") {
        Alert.alert("Wrong code", "That code didn't match. Try again.");
        return;
      }
      Alert.alert("2FA failed", "Could not verify the code.");
    } catch (err) {
      Alert.alert("2FA failed", (err as Error).message);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <StepLayout>
      <View style={styles.center}>
        <Text style={styles.title}>Verify it's you</Text>
        <Text style={styles.body}>
          Enter the verification code MyChart sent to{" "}
          <Text style={styles.bodyEm}>{deliveryLabel}</Text>.
        </Text>
        <TextInput
          testID="twofa-code"
          style={[styles.input, styles.codeInput]}
          placeholder="123456"
          placeholderTextColor="#999"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          maxLength={8}
          editable={!verifying}
        />
        <Pressable
          testID="twofa-verify"
          style={[styles.primaryButton, verifying && styles.disabled]}
          onPress={handleVerify}
          disabled={verifying}
        >
          {verifying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Verify</Text>
          )}
        </Pressable>
      </View>
    </StepLayout>
  );
}
