import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { signInWithGoogle } from "@/lib/backend/google-signin";
import { StepLayout } from "../step-layout";
import { styles } from "../styles";

type Props = {
  /** Email of the already-signed-in user, if a backend session exists. */
  initialEmail: string | null;
  /** Called once the user has a confirmed backend session. */
  onSignedIn: (email: string) => void;
};

export function GoogleStep({ initialEmail, onSignedIn }: Props) {
  const [signingIn, setSigningIn] = useState(false);

  async function handleSignIn() {
    setSigningIn(true);
    try {
      const user = await signInWithGoogle();
      onSignedIn(user.email);
    } catch (err) {
      Alert.alert("Sign-in failed", (err as Error).message);
    } finally {
      setSigningIn(false);
    }
  }

  // Dev-only escape hatch: skip Google so we can walk the rest of the
  // onboarding flow on the simulator without an OAuth round-trip. Stripped
  // from production bundles by the __DEV__ gate.
  function handleDevSkip() {
    onSignedIn("dev@openrecord.local");
  }

  const alreadySignedIn = !!initialEmail;

  return (
    <StepLayout>
      <View style={styles.center}>
        <Text style={styles.title}>Sign in with Google</Text>
        <Text style={styles.body}>
          Get $50 / month of AI credit included — no API key needed. We only see
          your email and name. Your medical data never leaves your device.
        </Text>
        {initialEmail ? (
          <Text style={styles.metaText}>Signed in as {initialEmail}</Text>
        ) : null}
        <Pressable
          testID="google-continue"
          style={[styles.primaryButton, signingIn && styles.disabled]}
          onPress={alreadySignedIn ? () => onSignedIn(initialEmail!) : handleSignIn}
          disabled={signingIn}
        >
          {signingIn ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {alreadySignedIn ? "Continue" : "Continue with Google"}
            </Text>
          )}
        </Pressable>
        {__DEV__ && !alreadySignedIn ? (
          <Pressable
            testID="google-dev-skip"
            style={styles.secondaryButton}
            onPress={handleDevSkip}
            disabled={signingIn}
          >
            <Text style={styles.secondaryButtonText}>Skip (dev)</Text>
          </Pressable>
        ) : null}
      </View>
    </StepLayout>
  );
}
