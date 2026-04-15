import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth/auth-context";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  if (isAuthenticated) {
    return <Redirect href="/(auth)" />;
  }

  return <Redirect href="/onboarding" />;
}
