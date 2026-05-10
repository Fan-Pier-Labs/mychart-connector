import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  addMyChartAccount,
  type StoredMyChartAccount,
} from "@/lib/storage/secure-store";
import { connectAccount } from "@/lib/scrapers/session-manager";
import {
  hostnameFromInstance,
  type MyChartInstance,
} from "@/lib/mychart-instances";
import { StepLayout } from "../step-layout";
import { styles } from "../styles";

type Props = {
  /** Provider chosen on the picker step. Null when the user opted to enter a hostname manually. */
  instance: MyChartInstance | null;
  /** Go back to the picker. */
  onChangeInstance: () => void;
  /** Sign-in succeeded with no 2FA. */
  onLoggedIn: (account: StoredMyChartAccount) => void;
  /** Sign-in succeeded but the provider wants a 2FA code. */
  onNeed2fa: (account: StoredMyChartAccount, deliveryLabel: string) => void;
};

export function MyChartStep({
  instance,
  onChangeInstance,
  onLoggedIn,
  onNeed2fa,
}: Props) {
  const [hostname, setHostname] = useState(
    instance ? hostnameFromInstance(instance) : "",
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [connecting, setConnecting] = useState(false);

  async function handleConnect() {
    if (!hostname.trim() || !username.trim() || !password) {
      Alert.alert("Missing info", "Hostname, username, and password are required.");
      return;
    }
    setConnecting(true);
    try {
      const account = await addMyChartAccount({
        hostname: hostname.trim(),
        username: username.trim(),
        password,
      });
      const result = await connectAccount(account);
      if (result.state === "logged_in") {
        onLoggedIn(account);
        return;
      }
      if (result.state === "need_2fa") {
        const delivery = result.twoFaDelivery;
        const label =
          delivery?.contact ??
          (delivery?.method === "sms"
            ? "your phone"
            : delivery?.method === "email"
              ? "your email"
              : "your inbox");
        onNeed2fa(account, label);
        return;
      }
      if (result.state === "invalid_login") {
        Alert.alert("Invalid credentials", "Double-check your username and password.");
        return;
      }
      Alert.alert("Could not sign in", result.error ?? "Unknown error.");
    } catch (err) {
      Alert.alert("Connection failed", (err as Error).message);
    } finally {
      setConnecting(false);
    }
  }

  return (
    <StepLayout>
      <View style={styles.center}>
        <Text style={styles.title}>Connect MyChart</Text>
        <Text style={styles.body}>
          Sign in to your MyChart account. If your provider asks for a 2FA
          code, we'll prompt you next. After that we'll set up a passkey so
          you never need to type this password again.
        </Text>
        {instance ? (
          <View style={styles.selectedInstance}>
            {instance.logoUrl ? (
              <Image
                source={{ uri: instance.logoUrl }}
                style={styles.selectedInstanceLogo}
                resizeMode="contain"
              />
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedInstanceName} numberOfLines={1}>
                {instance.name}
              </Text>
              <Text style={styles.selectedInstanceHost} numberOfLines={1}>
                {hostname}
              </Text>
            </View>
            <Pressable
              testID="mychart-change"
              onPress={onChangeInstance}
              disabled={connecting}
            >
              <Text style={styles.selectedInstanceChange}>Change</Text>
            </Pressable>
          </View>
        ) : (
          <TextInput
            testID="mychart-hostname"
            style={styles.input}
            placeholder="mychart.example.org"
            placeholderTextColor="#999"
            value={hostname}
            onChangeText={setHostname}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!connecting}
          />
        )}
        <TextInput
          testID="mychart-username"
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#999"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!connecting}
        />
        <TextInput
          testID="mychart-password"
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!connecting}
        />
        <Pressable
          testID="mychart-signin"
          style={[styles.primaryButton, connecting && styles.disabled]}
          onPress={handleConnect}
          disabled={connecting}
        >
          {connecting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Sign in to MyChart</Text>
          )}
        </Pressable>
      </View>
    </StepLayout>
  );
}
