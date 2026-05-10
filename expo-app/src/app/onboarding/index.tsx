import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  setSecureValue,
  getClaudeApiKey,
  type StoredMyChartAccount,
} from "@/lib/storage/secure-store";
import { getBackendSession } from "@/lib/backend/session";
import { prefetchInstances, type MyChartInstance } from "@/lib/mychart-instances";
import { WelcomeStep } from "./steps/welcome-step";
import { GoogleStep } from "./steps/google-step";
import { PickerStep } from "./steps/picker-step";
import { MyChartStep } from "./steps/mychart-step";
import { TwoFaStep } from "./steps/twofa-step";
import { PasskeyStep } from "./steps/passkey-step";

type Step = "welcome" | "google" | "picker" | "mychart" | "twofa" | "passkey";

/**
 * Onboarding orchestrator. Owns the current step and the cross-step state
 * (signed-in email, selected provider, connected MyChart account, 2FA
 * delivery label) and renders one step component at a time. Each step
 * owns its own UI-local state (form fields, in-flight flags) and reports
 * back through callbacks.
 */
export default function OnboardingScreen() {
  const { setSetupComplete } = useAuth();
  const [step, setStep] = useState<Step>("welcome");
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<MyChartInstance | null>(null);
  const [account, setAccount] = useState<StoredMyChartAccount | null>(null);
  const [twoFaDelivery, setTwoFaDelivery] = useState<string>("your inbox");

  // Dev shortcut: BYO Claude key + backend session → straight to chat.
  // Also pre-warm the MyChart instance list so the picker is instant.
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
        return;
      }
      prefetchInstances().catch(() => undefined);
    })();
  }, [setSetupComplete]);

  async function finishSetup() {
    await setSecureValue("setup_complete", "true");
    setSetupComplete();
  }

  if (step === "welcome") {
    return <WelcomeStep onGetStarted={() => setStep("google")} />;
  }

  if (step === "google") {
    return (
      <GoogleStep
        initialEmail={signedInEmail}
        onSignedIn={(email) => {
          setSignedInEmail(email);
          setStep("picker");
        }}
      />
    );
  }

  if (step === "picker") {
    return (
      <PickerStep
        onPick={(instance) => {
          setSelectedInstance(instance);
          setStep("mychart");
        }}
        onManualEntry={() => {
          setSelectedInstance(null);
          setStep("mychart");
        }}
      />
    );
  }

  if (step === "mychart") {
    return (
      <MyChartStep
        instance={selectedInstance}
        onChangeInstance={() => setStep("picker")}
        onLoggedIn={(acc) => {
          setAccount(acc);
          setStep("passkey");
        }}
        onNeed2fa={(acc, label) => {
          setAccount(acc);
          setTwoFaDelivery(label);
          setStep("twofa");
        }}
      />
    );
  }

  if (step === "twofa") {
    return (
      <TwoFaStep
        accountId={account!.id}
        deliveryLabel={twoFaDelivery}
        onLoggedIn={() => setStep("passkey")}
      />
    );
  }

  return <PasskeyStep accountId={account?.id ?? null} onDone={finishSetup} />;
}
