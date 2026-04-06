"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent,
} from "@/components/ui/card";
import { useAppContext } from "@/lib/app-context";

import { useMyChartAccounts } from "./mychart-accounts/use-mychart-accounts";
import { MyChartAccountsCard } from "./mychart-accounts/mychart-accounts-card";
import { TwofaPrompt } from "./mychart-accounts/twofa-prompt";
import { TotpSetupPrompt } from "./mychart-accounts/totp-setup-prompt";
import { ProfileCard } from "./profile-card/profile-card";
import { ScrapeCard } from "./scrape-card/scrape-card";
import { McpCard } from "./mcp-card/mcp-card";
import { NotificationsCard } from "./notifications-card/notifications-card";
import { SecurityCard } from "./security-card/security-card";

export default function HomePage() {
  const router = useRouter();
  const ctx = useAppContext();
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  const accounts = useMyChartAccounts();

  useEffect(() => {
    if (!ctx.sessionLoading && !ctx.user) {
      router.push("/login");
    }
  }, [ctx.user, ctx.sessionLoading, router]);

  function handleLogout() {
    ctx.resetAll();
    router.push("/login");
  }

  if (!ctx.user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">MyChart MCP</h1>
          <Card>
            <CardContent className="py-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground">{loadingText}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 2FA prompt (full-page takeover)
  if (accounts.twofaSessionKey) {
    return (
      <TwofaPrompt
        twofaCode={accounts.twofaCode}
        setTwofaCode={accounts.setTwofaCode}
        twofaLoading={accounts.twofaLoading}
        twofaDelivery={accounts.twofaDelivery}
        handle2fa={accounts.handle2fa}
        cancel2fa={accounts.cancel2fa}
      />
    );
  }

  // TOTP setup prompt (full-page takeover)
  if (accounts.totpPromptInstanceId) {
    return (
      <TotpSetupPrompt
        totpSetupLoading={accounts.totpSetupLoading}
        totpWarning={accounts.totpWarning}
        totpErrorMessage={accounts.totpErrorMessage}
        handleTotpSetup={accounts.handleTotpSetup}
        handleTotpSkip={accounts.handleTotpSkip}
        handleTotpContinueAnyway={accounts.handleTotpContinueAnyway}
        handleTotpRetry={accounts.handleTotpRetry}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">MyChart MCP</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Signed in as {ctx.user.name || ctx.user.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/Fan-Pier-Labs/openrecord"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <MyChartAccountsCard {...accounts} />
          <ProfileCard />
          <McpCard />
          <ScrapeCard onLoadingChange={(l, t) => { setLoading(l); setLoadingText(t); }} />
          <NotificationsCard />
          <SecurityCard />
        </div>
      </div>
    </div>
  );
}
