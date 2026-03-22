"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { ScrapeResults } from "@/types/scrape-results";
import { authClient } from "@/lib/auth-client";

export interface ProfileData {
  name: string;
  dob: string;
  mrn: string;
  pcp: string;
}

export interface MyChartInstanceInfo {
  id: string;
  hostname: string;
  username: string;
  mychartEmail: string | null;
  hasTotpSecret: boolean;
  connected: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AppContextType {
  // BetterAuth user
  user: { id: string; name: string; email: string; image?: string | null; twoFactorEnabled?: boolean } | null;
  userLoading: boolean;

  // MyChart instances
  instances: MyChartInstanceInfo[];
  setInstances: (instances: MyChartInstanceInfo[]) => void;
  refreshInstances: () => Promise<void>;

  // Active MyChart session
  activeSessionKey: string;
  setActiveSessionKey: (key: string) => void;
  activeInstanceId: string;
  setActiveInstanceId: (id: string) => void;

  // MyChart profile for active session
  profile: ProfileData | null;
  setProfile: (profile: ProfileData | null) => void;

  // Scrape results
  results: ScrapeResults | null;
  setResults: (results: ScrapeResults | null) => void;

  // Demo mode
  isDemo: boolean;
  setIsDemo: (isDemo: boolean) => void;

  // MCP URLs
  mcpUrl: string;
  setMcpUrl: (mcpUrl: string) => void;
  mcpUrlSsl: string;
  setMcpUrlSsl: (mcpUrlSsl: string) => void;

  // Legacy compat — token is an alias for activeSessionKey
  token: string;
  setToken: (token: string) => void;

  // Legacy — hostname for display
  hostname: string;
  setHostname: (hostname: string) => void;

  // Legacy — raw credentials (unused, kept for compat)
  username: string;
  setUsername: (username: string) => void;
  password: string;
  setPassword: (password: string) => void;

  refreshSession: () => Promise<void>;
  resetAll: () => void;
  sessionLoading: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: userLoading, refetch: refreshSession } = authClient.useSession();

  const [instances, setInstances] = useState<MyChartInstanceInfo[]>([]);
  const [activeSessionKey, setActiveSessionKey] = useState("");
  const [activeInstanceId, setActiveInstanceId] = useState("");
  const [hostname, setHostname] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [results, setResults] = useState<ScrapeResults | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [mcpUrl, setMcpUrl] = useState("");
  const [mcpUrlSsl, setMcpUrlSsl] = useState("");
  const [sessionLoading, setSessionLoading] = useState(true);

  const refreshInstances = useCallback(async () => {
    try {
      const res = await fetch("/api/mychart-instances");
      if (res.ok) {
        const data = await res.json();
        setInstances(data);
      }
    } catch {
      // best-effort
    }
  }, []);

  // Load instances when user session is available
  useEffect(() => {
    async function init() {
      if (session?.user) {
        await refreshInstances();
      }
      setSessionLoading(false);
    }
    if (!userLoading) {
      init();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, session?.user]);

  const resetAll = useCallback(() => {
    authClient.signOut();
    setInstances([]);
    setActiveSessionKey("");
    setActiveInstanceId("");
    setHostname("");
    setUsername("");
    setPassword("");
    setProfile(null);
    setResults(null);
    setIsDemo(false);
    setMcpUrl("");
    setMcpUrlSsl("");
  }, []);

  const user = session?.user ? {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    twoFactorEnabled: (session.user as Record<string, unknown>).twoFactorEnabled as boolean | undefined,
  } : null;

  return (
    <AppContext.Provider
      value={{
        user,
        userLoading,
        instances, setInstances, refreshInstances,
        activeSessionKey, setActiveSessionKey,
        activeInstanceId, setActiveInstanceId,
        token: activeSessionKey, setToken: setActiveSessionKey,
        hostname, setHostname,
        username, setUsername,
        password, setPassword,
        profile, setProfile,
        results, setResults,
        isDemo, setIsDemo,
        mcpUrl, setMcpUrl,
        mcpUrlSsl, setMcpUrlSsl,
        refreshSession: async () => { await refreshSession(); },
        resetAll,
        sessionLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
