import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/lib/auth/auth-context";
import { initDatabase } from "@/lib/storage/database";
import { getMyChartAccounts } from "@/lib/storage/secure-store";

const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h per account

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const lastRefreshAt = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && inAuthGroup) {
      router.replace("/onboarding");
    } else if (isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)");
    }
  }, [isAuthenticated, segments, isLoading]);

  // Background memory refresh on app foreground. Debounced per-account
  // to once every REFRESH_INTERVAL_MS so we don't hammer scrapers or AI.
  useEffect(() => {
    if (!isAuthenticated) return;

    async function maybeRefreshAll() {
      try {
        const accounts = await getMyChartAccounts();
        if (accounts.length === 0) return;
        const now = Date.now();
        const due = accounts.filter((a) => {
          const last = lastRefreshAt.current.get(a.id) ?? 0;
          return now - last >= REFRESH_INTERVAL_MS;
        });
        if (due.length === 0) return;
        const { refreshMemory } = await import("@/lib/memory/builder");
        for (const a of due) {
          lastRefreshAt.current.set(a.id, now);
          refreshMemory(a.id).catch((err) =>
            console.warn(`[memory] refresh failed for ${a.id}:`, err.message),
          );
        }
      } catch (err) {
        console.warn("[memory] foreground refresh dispatch failed:", (err as Error).message);
      }
    }

    // Run once on mount (covers cold start) and on every transition to active.
    maybeRefreshAll();
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") maybeRefreshAll();
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  return (
    <>
      <StatusBar style="dark" />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDatabase().then(() => setDbReady(true));
  }, []);

  if (!dbReady) return null;

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
