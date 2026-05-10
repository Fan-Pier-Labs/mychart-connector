import { View, Text, Pressable } from "react-native";
import { StepLayout } from "../step-layout";
import { styles } from "../styles";

export function WelcomeStep({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <StepLayout>
      <View style={styles.center}>
        <Text style={styles.title}>OpenRecord</Text>
        <Text style={styles.subtitle}>Your health records, in your pocket</Text>
        <Text style={styles.body}>
          Connect your MyChart account, then ask AI anything about your health.
          Everything stays on your device.
        </Text>
        <Pressable
          testID="welcome-get-started"
          style={styles.primaryButton}
          onPress={onGetStarted}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </Pressable>
      </View>
    </StepLayout>
  );
}
