import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as LocalAuthentication from "expo-local-authentication";
import { useAuth } from "@/lib/auth/auth-context";
import {
  setSecureValue,
  getClaudeApiKey,
  addMyChartAccount,
} from "@/lib/storage/secure-store";
import { signInWithGoogle } from "@/lib/backend/google-signin";
import { getBackendSession } from "@/lib/backend/session";

type Step = "welcome" | "privacy" | "faceid" | "google" | "account" | "done";

export default function OnboardingScreen() {
  const { setSetupComplete } = useAuth();
  const [step, setStep] = useState<Step>("welcome");
  const [signingIn, setSigningIn] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [hostname, setHostname] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Dev shortcut: if a BYO Claude key is already present AND a backend
  // session exists, skip straight to chat. Real users will always see
  // the Google step first time.
  useEffect(() => {
    (async () => {
      const [byoKey, session] = await Promise.all([
        getClaudeApiKey(),
        getBackendSession(),
      ]);
      if (session) setSignedInEmail(session.user.email);
      if (__DEV__ && byoKey && session) {
        await setSecureValue("setup_complete", "true");
        setSetupComplete();
      }
    })();
  }, []);

  async function handleFaceId() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Enable Face ID for OpenRecord",
        fallbackLabel: "Use Passcode",
      });
      if (!result.success) {
        Alert.alert("Authentication failed", "Try again or skip.");
        return;
      }
    }
    setStep("google");
  }

  async function handleGoogleSignIn() {
    setSigningIn(true);
    try {
      const user = await signInWithGoogle();
      setSignedInEmail(user.email);
      setStep("account");
    } catch (err) {
      Alert.alert("Sign-in failed", (err as Error).message);
    } finally {
      setSigningIn(false);
    }
  }

  async function handleAddAccount() {
    if (!hostname.trim() || !username.trim() || !password) {
      Alert.alert("Error", "All fields are required.");
      return;
    }
    await addMyChartAccount({
      hostname: hostname.trim(),
      username: username.trim(),
      password,
    });
    await finishSetup();
  }

  async function handleSkipAccount() {
    await finishSetup();
  }

  async function finishSetup() {
    await setSecureValue("setup_complete", "true");
    setSetupComplete();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {step === "welcome" && (
          <View style={styles.center}>
            <Text style={styles.title}>OpenRecord</Text>
            <Text style={styles.subtitle}>Your health data, on your device</Text>
            <Text style={styles.body}>
              OpenRecord connects directly to your MyChart accounts and stores
              everything locally on your phone. Use AI to understand and manage
              your health data.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => setStep("privacy")}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </Pressable>
          </View>
        )}

        {step === "privacy" && (
          <View style={styles.center}>
            <Text style={styles.title}>Privacy and Security</Text>
            <Text style={styles.body}>
              Privacy and security are our top priorities. Nothing is saved on
              our servers, and most requests are made directly from this mobile
              application to MyChart's servers. The only exception are the AI
              calls, which are made to model providers.
              {"\n\n"}
              Our entire app is open source.
            </Text>
            <Pressable
              testID="privacy-continue"
              style={styles.primaryButton}
              onPress={() => setStep("faceid")}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </Pressable>
          </View>
        )}

        {step === "faceid" && (
          <View style={styles.center}>
            <Text style={styles.title}>Secure Access</Text>
            <Text style={styles.body}>
              Protect your health data with Face ID. The app will require
              biometric authentication every time you open it.
            </Text>
            <Pressable style={styles.primaryButton} onPress={handleFaceId}>
              <Text style={styles.primaryButtonText}>Enable Face ID</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => setStep("google")}>
              <Text style={styles.secondaryButtonText}>Skip</Text>
            </Pressable>
          </View>
        )}

        {step === "google" && (
          <View style={styles.center}>
            <Text style={styles.title}>Sign in with Google</Text>
            <Text style={styles.body}>
              Signing in with Google unlocks $50 / month of AI credit — no API
              key needed. We only see your email and name.
            </Text>
            {signedInEmail ? (
              <Text style={styles.body}>Signed in as {signedInEmail}</Text>
            ) : null}
            <Pressable
              style={[styles.primaryButton, signingIn && styles.disabled]}
              onPress={handleGoogleSignIn}
              disabled={signingIn}
            >
              {signingIn ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Continue with Google</Text>
              )}
            </Pressable>
            {signedInEmail ? (
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setStep("account")}
              >
                <Text style={styles.secondaryButtonText}>Continue</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {step === "account" && (
          <View style={styles.center}>
            <Text style={styles.title}>Add MyChart Account</Text>
            <Text style={styles.body}>
              Connect your first MyChart account. You can add more later in Settings.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="mychart.example.org"
              placeholderTextColor="#999"
              value={hostname}
              onChangeText={setHostname}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Pressable style={styles.primaryButton} onPress={handleAddAccount}>
              <Text style={styles.primaryButtonText}>Add & Continue</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handleSkipAccount}>
              <Text style={styles.secondaryButtonText}>Skip for now</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  center: { alignItems: "center" },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 32,
    maxWidth: 320,
  },
  input: {
    width: "100%",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#000",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 15,
  },
  disabled: { opacity: 0.6 },
});
