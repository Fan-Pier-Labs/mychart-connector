import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import { getSecureValue } from "@/lib/storage/secure-store";

type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  authenticate: () => Promise<boolean>;
  setSetupComplete: () => void;
};

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  isLoading: true,
  authenticate: async () => false,
  setSetupComplete: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSetupAndAuth();
  }, []);

  async function checkSetupAndAuth() {
    // Check if onboarding is complete
    const setupDone = await getSecureValue("setup_complete");
    if (!setupDone) {
      setIsLoading(false);
      return;
    }

    // Check if biometrics are available
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock OpenRecord",
        fallbackLabel: "Use Passcode",
        disableDeviceFallback: false,
      });
      setIsAuthenticated(result.success);
    } else {
      // No biometrics available — allow access (secured by device passcode)
      setIsAuthenticated(true);
    }

    setIsLoading(false);
  }

  const authenticate = useCallback(async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock OpenRecord",
        fallbackLabel: "Use Passcode",
        disableDeviceFallback: false,
      });
      setIsAuthenticated(result.success);
      return result.success;
    }

    setIsAuthenticated(true);
    return true;
  }, []);

  const setSetupComplete = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, authenticate, setSetupComplete }}>
      {children}
    </AuthContext.Provider>
  );
}
