"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppContext, type MyChartInstanceInfo } from "@/lib/app-context";
import { authClient } from "@/lib/auth-client";
import { track } from "@/lib/track";
import { QRCodeSVG } from "qrcode.react";

export default function HomePage() {
  const router = useRouter();
  const ctx = useAppContext();
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [mcpLoading, setMcpLoading] = useState(false);
  const [mcpCopied, setMcpCopied] = useState(false);
  const [mcpSslCopied, setMcpSslCopied] = useState(false);
  const [mcpKeyGenerated, setMcpKeyGenerated] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  // Add instance form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHostname, setNewHostname] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // 2FA state
  const [twofaSessionKey, setTwofaSessionKey] = useState("");
  const [twofaCode, setTwofaCode] = useState("");
  const [twofaLoading, setTwofaLoading] = useState(false);
  const [twofaDelivery, setTwofaDelivery] = useState<{ method: string; contact?: string } | null>(null);

  // TOTP setup state
  const [totpPromptInstanceId, setTotpPromptInstanceId] = useState("");
  const [totpSetupLoading, setTotpSetupLoading] = useState(false);
  const [totpWarning, setTotpWarning] = useState(false);

  // Connecting state
  const [connectingId, setConnectingId] = useState("");

  // App 2FA (BetterAuth TOTP) state
  const [appTotpLoading, setAppTotpLoading] = useState(false);
  const [appTotpURI, setAppTotpURI] = useState("");
  const [appBackupCodes, setAppBackupCodes] = useState<string[]>([]);
  const [appTotpVerifyCode, setAppTotpVerifyCode] = useState("");
  const [appTotpPasswordPrompt, setAppTotpPasswordPrompt] = useState<"enable" | "disable" | null>(null);
  const [appTotpPassword, setAppTotpPassword] = useState("");
  const [backupCodesPassword, setBackupCodesPassword] = useState("");
  const [showBackupCodesPrompt, setShowBackupCodesPrompt] = useState(false);

  // Passkey state
  const [passkeys, setPasskeys] = useState<Array<{ id: string; name?: string | null; createdAt: string }>>([]);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [addPasskeyName, setAddPasskeyName] = useState("");
  const [showAddPasskey, setShowAddPasskey] = useState(false);

  useEffect(() => {
    if (!ctx.sessionLoading && !ctx.user) {
      router.push("/login");
    }
  }, [ctx.user, ctx.sessionLoading, router]);

  useEffect(() => {
    if (ctx.activeSessionKey && !ctx.profile) {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.activeSessionKey]);

  // Check if user already has an API key
  useEffect(() => {
    if (ctx.user) {
      fetch("/api/mcp-key")
        .then(r => r.json())
        .then(data => { if (data.hasKey) setHasExistingKey(true); })
        .catch(() => {});
    }
  }, [ctx.user]);

  async function fetchProfile() {
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKey: ctx.activeSessionKey }),
      });
      const data = await res.json();
      if (!data.error) {
        ctx.setProfile(data);
      }
    } catch {
      // best-effort
    }
  }

  async function addInstance() {
    track('instance_added');
    if (!newHostname || !newUsername || !newPassword) {
      toast.error("Hostname, username, and password are required.");
      return;
    }

    setAddLoading(true);
    try {
      const res = await fetch("/api/mychart-instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostname: newHostname,
          username: newUsername,
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add instance.");
        setAddLoading(false);
        return;
      }

      // Clear form and refresh
      setNewHostname("");
      setNewUsername("");
      setNewPassword("");
      setShowAddForm(false);
      await ctx.refreshInstances();
    } catch (err) {
      toast.error("Network error: " + (err as Error).message);
    } finally {
      setAddLoading(false);
    }
  }

  async function connectInstance(instance: MyChartInstanceInfo) {

    setConnectingId(instance.id);

    try {
      const res = await fetch(`/api/mychart-instances/${instance.id}/connect`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.state === "invalid_login") {
        toast.error(`Invalid credentials for ${instance.hostname}. Please update your stored credentials.`);
        setConnectingId("");
        return;
      }

      if (data.state === "error") {
        toast.error(data.error || "Connection failed.");
        setConnectingId("");
        return;
      }

      if (data.state === "need_2fa") {
        setTwofaSessionKey(data.sessionKey);
        setTwofaDelivery(data.twoFaDelivery || null);
        setConnectingId("");
        return;
      }

      // logged_in
      ctx.setActiveSessionKey(data.sessionKey);
      ctx.setActiveInstanceId(instance.id);
      ctx.setHostname(instance.hostname);
      ctx.setProfile(null);
      await ctx.refreshInstances();
      setConnectingId("");
    } catch (err) {
      toast.error("Network error: " + (err as Error).message);
      setConnectingId("");
    }
  }

  async function handle2fa() {

    if (!twofaCode) {
      toast.error("Enter the 2FA code.");
      return;
    }

    setTwofaLoading(true);
    try {
      const res = await fetch("/api/twofa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKey: twofaSessionKey, code: twofaCode }),
      });
      const data = await res.json();

      if (data.state === "invalid_2fa") {
        toast.error("Invalid 2FA code. Try again.");
        setTwofaLoading(false);
        return;
      }

      if (data.state === "error") {
        toast.error(data.error || "2FA error.");
        setTwofaLoading(false);
        return;
      }

      ctx.setActiveSessionKey(data.sessionKey);
      const instanceId = data.instanceId || data.sessionKey.split(":")[1];
      ctx.setActiveInstanceId(instanceId);
      const inst = ctx.instances.find((i) => i.id === instanceId);
      if (inst) ctx.setHostname(inst.hostname);
      ctx.setProfile(null);
      setTwofaSessionKey("");
      setTwofaCode("");
      setTwofaDelivery(null);
      await ctx.refreshInstances();

      // Offer TOTP setup if the instance doesn't have one
      if (data.offerTotpSetup && instanceId) {
        setTotpPromptInstanceId(instanceId);
      }
    } catch (err) {
      toast.error("Network error: " + (err as Error).message);
    } finally {
      setTwofaLoading(false);
    }
  }

  async function handleTotpSetup() {

    setTotpSetupLoading(true);
    try {
      const res = await fetch(`/api/mychart-instances/${totpPromptInstanceId}/setup-totp`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setTotpPromptInstanceId("");
        setTotpWarning(false);
        await ctx.refreshInstances();
      } else {
        // Setup failed — show warning
        setTotpSetupLoading(false);
        setTotpWarning(true);
      }
    } catch {
      setTotpSetupLoading(false);
      setTotpWarning(true);
    } finally {
      setTotpSetupLoading(false);
    }
  }

  function handleTotpSkip() {
    setTotpWarning(true);
  }

  function handleTotpContinueAnyway() {
    setTotpPromptInstanceId("");
    setTotpWarning(false);
  }

  function handleTotpRetry() {
    setTotpWarning(false);
  }

  async function deleteInstance(id: string) {
    track('instance_deleted');
    try {
      await fetch(`/api/mychart-instances/${id}`, { method: "DELETE" });
      if (ctx.activeInstanceId === id) {
        ctx.setActiveSessionKey("");
        ctx.setActiveInstanceId("");
        ctx.setProfile(null);
      }
      await ctx.refreshInstances();
    } catch (err) {
      toast.error("Failed to delete: " + (err as Error).message);
    }
  }

  async function startScraping() {
    track('scrape_button_clicked');
    setLoading(true);
    setLoadingText("Scraping your MyChart data (this may take a minute)...");

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKey: ctx.activeSessionKey }),
      });
      const data = await res.json();
      ctx.setResults(data);
      setLoading(false);
      router.push("/scrape-results");
    } catch (err) {
      toast.error("Scraping failed: " + (err as Error).message);
      setLoading(false);
    }
  }

  async function generateApiKey() {
    track('mcp_key_generated');
    setMcpLoading(true);
    try {
      const res = await fetch("/api/mcp-key", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        ctx.setMcpUrl(data.mcpUrl);
        if (data.mcpUrlSsl) ctx.setMcpUrlSsl(data.mcpUrlSsl);
        setMcpKeyGenerated(true);
        setHasExistingKey(true);
      }
    } catch (err) {
      toast.error("Failed to generate API key: " + (err as Error).message);
    } finally {
      setMcpLoading(false);
    }
  }

  async function revokeApiKey() {
    try {
      await fetch("/api/mcp-key", { method: "DELETE" });
      ctx.setMcpUrl("");
      ctx.setMcpUrlSsl("");
      setHasExistingKey(false);
      setMcpKeyGenerated(false);
    } catch (err) {
      toast.error("Failed to revoke API key: " + (err as Error).message);
    }
  }

  // Load passkeys when user is available
  useEffect(() => {
    if (ctx.user) {
      authClient.passkey.listUserPasskeys().then((result) => {
        if (result?.data) {
          setPasskeys(result.data.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: p.name as string | null,
            createdAt: p.createdAt as string,
          })));
        }
      }).catch(() => {});
    }
  }, [ctx.user]);

  async function loadPasskeys() {
    try {
      const result = await authClient.passkey.listUserPasskeys();
      if (result?.data) {
        setPasskeys(result.data.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: p.name as string | null,
          createdAt: p.createdAt as string,
        })));
      }
    } catch {
      // best-effort
    }
  }

  async function handleEnableTotp() {
    if (!appTotpPassword) {
      toast.error("Password is required.");
      return;
    }
    setAppTotpLoading(true);
    try {
      const result = await authClient.twoFactor.enable({ password: appTotpPassword });
      if (result.error) {
        toast.error(result.error.message || "Failed to enable 2FA.");
        setAppTotpLoading(false);
        return;
      }
      setAppTotpURI(result.data?.totpURI || "");
      setAppBackupCodes(result.data?.backupCodes || []);
      setAppTotpPasswordPrompt(null);
      setAppTotpPassword("");
    } catch (err) {
      toast.error("Failed: " + (err as Error).message);
    } finally {
      setAppTotpLoading(false);
    }
  }

  async function handleVerifyTotpSetup() {
    if (!appTotpVerifyCode) {
      toast.error("Enter a code from your authenticator app.");
      return;
    }
    setAppTotpLoading(true);
    try {
      const result = await authClient.twoFactor.verifyTotp({ code: appTotpVerifyCode });
      if (result.error) {
        toast.error(result.error.message || "Invalid code.");
        setAppTotpLoading(false);
        return;
      }
      toast.success("Two-factor authentication enabled!");
      setAppTotpURI("");
      setAppBackupCodes([]);
      setAppTotpVerifyCode("");
      await ctx.refreshSession();
    } catch (err) {
      toast.error("Verification failed: " + (err as Error).message);
    } finally {
      setAppTotpLoading(false);
    }
  }

  async function handleDisableTotp() {
    if (!appTotpPassword) {
      toast.error("Password is required.");
      return;
    }
    setAppTotpLoading(true);
    try {
      const result = await authClient.twoFactor.disable({ password: appTotpPassword });
      if (result.error) {
        toast.error(result.error.message || "Failed to disable 2FA.");
        setAppTotpLoading(false);
        return;
      }
      toast.success("Two-factor authentication disabled.");
      setAppTotpPasswordPrompt(null);
      setAppTotpPassword("");
      await ctx.refreshSession();
    } catch (err) {
      toast.error("Failed: " + (err as Error).message);
    } finally {
      setAppTotpLoading(false);
    }
  }

  async function handleRegenerateBackupCodes() {
    if (!backupCodesPassword) {
      toast.error("Password is required.");
      return;
    }
    setAppTotpLoading(true);
    try {
      const result = await authClient.twoFactor.generateBackupCodes({ password: backupCodesPassword });
      if (result.error) {
        toast.error(result.error.message || "Failed to regenerate backup codes.");
        setAppTotpLoading(false);
        return;
      }
      setAppBackupCodes(result.data?.backupCodes || []);
      setShowBackupCodesPrompt(false);
      setBackupCodesPassword("");
      toast.success("New backup codes generated.");
    } catch (err) {
      toast.error("Failed: " + (err as Error).message);
    } finally {
      setAppTotpLoading(false);
    }
  }

  async function handleAddPasskey() {
    setPasskeyLoading(true);
    try {
      const result = await authClient.passkey.addPasskey({ name: addPasskeyName || undefined });
      if (result?.error) {
        toast.error(result.error.message || "Failed to add passkey.");
        setPasskeyLoading(false);
        return;
      }
      toast.success("Passkey added!");
      setShowAddPasskey(false);
      setAddPasskeyName("");
      await loadPasskeys();
    } catch (err) {
      toast.error("Failed to add passkey: " + (err as Error).message);
    } finally {
      setPasskeyLoading(false);
    }
  }

  async function handleDeletePasskey(id: string) {
    setPasskeyLoading(true);
    try {
      const result = await authClient.passkey.deletePasskey({ id });
      if (result?.error) {
        toast.error(result.error.message || "Failed to remove passkey.");
        setPasskeyLoading(false);
        return;
      }
      toast.success("Passkey removed.");
      await loadPasskeys();
    } catch (err) {
      toast.error("Failed: " + (err as Error).message);
    } finally {
      setPasskeyLoading(false);
    }
  }

  async function copyMcpUrl() {
    await navigator.clipboard.writeText(ctx.mcpUrl);
    setMcpCopied(true);
    setTimeout(() => setMcpCopied(false), 2000);
  }

  async function copyMcpSslUrl() {
    await navigator.clipboard.writeText(ctx.mcpUrlSsl);
    setMcpSslCopied(true);
    setTimeout(() => setMcpSslCopied(false), 2000);
  }

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

  // 2FA prompt
  if (twofaSessionKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>
              {twofaDelivery?.method === "sms"
                ? `A verification code has been sent via text message${twofaDelivery.contact ? ` to ${twofaDelivery.contact}` : ""}. Enter it below.`
                : `A verification code has been sent to your email${twofaDelivery?.contact ? ` (${twofaDelivery.contact})` : ""}. Enter it below.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="twofa">2FA Code</Label>
              <Input
                id="twofa"
                placeholder="6-digit code"
                maxLength={10}
                value={twofaCode}
                onChange={(e) => setTwofaCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handle2fa()}
                autoFocus
              />
            </div>
            <Button
              className="w-full"
              onClick={handle2fa}
              disabled={twofaLoading}
            >
              {twofaLoading ? "Verifying..." : "Submit Code"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { setTwofaSessionKey(""); setTwofaCode(""); setTwofaDelivery(null); }}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // TOTP setup prompt
  if (totpPromptInstanceId) {
    // Loading state while TOTP setup runs
    if (totpSetupLoading) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Setting up automatic sign-in...</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground">Configuring your MyChart account. This only takes a few seconds.</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Warning state (skip or failure)
    if (totpWarning) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <Card className="w-full max-w-md border-amber-200">
            <CardHeader>
              <CardTitle className="text-amber-700">2FA not configured</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Without automatic sign-in, your session will only last a few hours.
                Once it expires, you&apos;ll need to log in again with email verification.
              </p>
              <p className="text-sm text-muted-foreground">
                The AI agent won&apos;t be able to reconnect to your MyChart account automatically.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleTotpRetry}
                >
                  Retry
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleTotpContinueAnyway}
                >
                  Continue anyway
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Enable / Skip prompt
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Enable automatic sign-in?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To access your MyChart account on your behalf, the AI agent needs to sign in
              automatically. We&apos;ll set up a TOTP authenticator so the agent can log in
              without requiring email codes each time.
            </p>
            <p className="text-sm text-muted-foreground">
              This adds an authenticator app to your MyChart security settings.
              You can disable it anytime from your MyChart account.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleTotpSkip}
              >
                Skip
              </Button>
              <Button
                className="flex-1"
                onClick={handleTotpSetup}
              >
                Enable
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
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
              href="https://github.com/Fan-Pier-Labs/mychart-connector"
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
          {/* MyChart Instances */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>MyChart Accounts</CardTitle>
                  <CardDescription>
                    Manage your connected MyChart portals.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  {showAddForm ? "Cancel" : "Add Account"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add form */}
              {showAddForm && (
                <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="new-hostname" className="text-xs">MyChart Hostname</Label>
                      <Input
                        id="new-hostname"
                        placeholder="e.g. mychart.example.org"
                        value={newHostname}
                        onChange={(e) => setNewHostname(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="new-username" className="text-xs">Username</Label>
                      <Input
                        id="new-username"
                        placeholder="MyChart username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="new-password" className="text-xs">Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="MyChart password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={addInstance}
                    disabled={addLoading}
                  >
                    {addLoading ? "Adding..." : "Add MyChart Account"}
                  </Button>
                </div>
              )}

              {/* Instance list */}
              {ctx.sessionLoading && ctx.instances.length === 0 && (
                <div className="flex items-center justify-center py-6 gap-2">
                  <svg className="animate-spin h-5 w-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm text-muted-foreground">Loading accounts...</span>
                </div>
              )}
              {!ctx.sessionLoading && ctx.instances.length === 0 && !showAddForm && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No MyChart accounts added yet. Click &quot;Add Account&quot; to get started.
                </p>
              )}

              {ctx.instances.map((inst) => {
                const isActive = ctx.activeInstanceId === inst.id && inst.connected;
                const isConnecting = connectingId === inst.id;

                return (
                  <div
                    key={inst.id}
                    className={`flex items-center justify-between border rounded-lg p-4 ${
                      isActive ? "border-blue-300 bg-blue-50" : "border-slate-200"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex h-2 w-2 rounded-full ${inst.connected ? "bg-green-500" : "bg-slate-300"}`} />
                        <p className="font-medium text-sm truncate">{inst.hostname}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {inst.username}
                        {inst.hasTotpSecret && " (TOTP)"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {!inst.connected ? (
                        <Button
                          size="sm"
                          onClick={() => connectInstance(inst)}
                          disabled={isConnecting}
                        >
                          {isConnecting ? "Connecting..." : "Connect"}
                        </Button>
                      ) : isActive ? (
                        <span className="text-xs text-blue-600 font-medium">Active</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            ctx.setActiveSessionKey(`${ctx.user!.id}:${inst.id}`);
                            ctx.setActiveInstanceId(inst.id);
                            ctx.setHostname(inst.hostname);
                            ctx.setProfile(null);
                          }}
                        >
                          Select
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteInstance(inst.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Active Instance Info */}
          {ctx.activeSessionKey && ctx.profile && (
            <Card>
              <CardHeader>
                <CardTitle>{ctx.profile.name}</CardTitle>
                <CardDescription>
                  Connected to {ctx.hostname}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Date of Birth</span>
                    <p className="font-medium">{ctx.profile.dob}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">MRN</span>
                    <p className="font-medium">{ctx.profile.mrn}</p>
                  </div>
                  {ctx.profile.pcp && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Primary Care Provider</span>
                      <p className="font-medium">{ctx.profile.pcp}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scrape — only show when connected */}
          {ctx.activeSessionKey && (
            <Card>
              <CardHeader>
                <CardTitle>Scrape Data</CardTitle>
                <CardDescription>
                  Pull all your medical records from MyChart.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={startScraping}>
                  Scrape Data Now
                </Button>
              </CardContent>
            </Card>
          )}

          {/* MCP — always visible, not gated on active session */}
          <Card>
            <CardHeader>
              <CardTitle>Connect to AI Assistant</CardTitle>
              <CardDescription>
                Generate an API key to use your health data with Claude Desktop, OpenClaw, or any MCP client. One URL works for all your MyChart accounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!ctx.mcpUrl ? (
                <div className="space-y-3">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={generateApiKey}
                    disabled={mcpLoading}
                  >
                    {mcpLoading ? "Generating..." : hasExistingKey ? "Regenerate API Key" : "Generate API Key"}
                  </Button>
                  {hasExistingKey && !mcpKeyGenerated && (
                    <p className="text-xs text-muted-foreground text-center">
                      You already have an API key. Regenerating will revoke the old one.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {mcpKeyGenerated && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
                      Copy this URL now — the API key is only shown once.
                    </div>
                  )}
                  {ctx.mcpUrlSsl && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-green-600">HTTPS (for Claude Desktop)</Label>
                      <div className="flex gap-2">
                        <Input readOnly value={ctx.mcpUrlSsl} className="font-mono text-xs" />
                        <Button variant="outline" size="sm" onClick={copyMcpSslUrl}>
                          {mcpSslCopied ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {ctx.mcpUrlSsl && <Label className="text-xs font-medium text-muted-foreground">HTTP</Label>}
                    <div className="flex gap-2">
                      <Input readOnly value={ctx.mcpUrl} className="font-mono text-xs" />
                      <Button variant="outline" size="sm" onClick={copyMcpUrl}>
                        {mcpCopied ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Claude Desktop:</strong> Settings &rarr; MCP Servers &rarr; Add &rarr; paste {ctx.mcpUrlSsl ? "HTTPS " : ""}URL</p>
                    <p><strong>OpenClaw:</strong> Add to your plugin config as <code>mcpUrl</code></p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={revokeApiKey}
                  >
                    Revoke API Key
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Manage two-factor authentication and passkeys for your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* TOTP 2FA Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Two-Factor Authentication (TOTP)</p>
                    <p className="text-xs text-muted-foreground">
                      {ctx.user?.twoFactorEnabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                  {!appTotpURI && !appTotpPasswordPrompt && (
                    <Button
                      size="sm"
                      variant={ctx.user?.twoFactorEnabled ? "destructive" : "default"}
                      onClick={() => {
                        setAppTotpPasswordPrompt(ctx.user?.twoFactorEnabled ? "disable" : "enable");
                        setAppTotpPassword("");
                      }}
                      disabled={appTotpLoading}
                    >
                      {ctx.user?.twoFactorEnabled ? "Disable" : "Enable"}
                    </Button>
                  )}
                </div>

                {/* Password prompt for enable/disable */}
                {appTotpPasswordPrompt && !appTotpURI && (
                  <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
                    <p className="text-sm text-muted-foreground">
                      Enter your password to {appTotpPasswordPrompt === "enable" ? "enable" : "disable"} two-factor authentication.
                    </p>
                    <Input
                      type="password"
                      placeholder="Password"
                      value={appTotpPassword}
                      onChange={(e) => setAppTotpPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (appTotpPasswordPrompt === "enable" ? handleEnableTotp() : handleDisableTotp())}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={appTotpPasswordPrompt === "enable" ? handleEnableTotp : handleDisableTotp}
                        disabled={appTotpLoading}
                      >
                        {appTotpLoading ? "Processing..." : "Confirm"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setAppTotpPasswordPrompt(null); setAppTotpPassword(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* TOTP setup flow — QR code + verify */}
                {appTotpURI && (
                  <div className="border border-slate-200 rounded-lg p-4 space-y-4 bg-slate-50">
                    <p className="text-sm font-medium">Scan this QR code with your authenticator app</p>
                    <div className="flex justify-center">
                      <QRCodeSVG value={appTotpURI} size={200} />
                    </div>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Can&apos;t scan? Show manual entry key
                      </summary>
                      <code className="block mt-2 p-2 bg-white rounded border text-xs break-all">
                        {appTotpURI}
                      </code>
                    </details>

                    {appBackupCodes.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-amber-700">Save your backup codes</p>
                        <p className="text-xs text-muted-foreground">
                          Store these codes somewhere safe. Each code can only be used once.
                        </p>
                        <div className="grid grid-cols-2 gap-1 p-3 bg-white rounded border font-mono text-xs">
                          {appBackupCodes.map((code, i) => (
                            <span key={i}>{code}</span>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(appBackupCodes.join("\n"));
                            toast.success("Backup codes copied!");
                          }}
                        >
                          Copy Backup Codes
                        </Button>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-xs">Enter a code from your authenticator app to verify</Label>
                      <Input
                        placeholder="6-digit code"
                        value={appTotpVerifyCode}
                        onChange={(e) => setAppTotpVerifyCode(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleVerifyTotpSetup()}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleVerifyTotpSetup}
                          disabled={appTotpLoading}
                        >
                          {appTotpLoading ? "Verifying..." : "Verify & Enable"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setAppTotpURI(""); setAppBackupCodes([]); setAppTotpVerifyCode(""); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Regenerate backup codes */}
                {ctx.user?.twoFactorEnabled && !appTotpURI && !appTotpPasswordPrompt && (
                  <>
                    {!showBackupCodesPrompt && appBackupCodes.length === 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowBackupCodesPrompt(true)}
                      >
                        Regenerate Backup Codes
                      </Button>
                    )}
                    {showBackupCodesPrompt && (
                      <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
                        <p className="text-sm text-muted-foreground">Enter your password to generate new backup codes.</p>
                        <Input
                          type="password"
                          placeholder="Password"
                          value={backupCodesPassword}
                          onChange={(e) => setBackupCodesPassword(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleRegenerateBackupCodes()}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleRegenerateBackupCodes} disabled={appTotpLoading}>
                            {appTotpLoading ? "Generating..." : "Generate"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setShowBackupCodesPrompt(false); setBackupCodesPassword(""); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                    {appBackupCodes.length > 0 && !appTotpURI && (
                      <div className="border border-slate-200 rounded-lg p-4 space-y-2 bg-slate-50">
                        <p className="text-sm font-medium text-amber-700">Your new backup codes</p>
                        <p className="text-xs text-muted-foreground">Store these codes somewhere safe. Each code can only be used once.</p>
                        <div className="grid grid-cols-2 gap-1 p-3 bg-white rounded border font-mono text-xs">
                          {appBackupCodes.map((code, i) => (
                            <span key={i}>{code}</span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(appBackupCodes.join("\n"));
                              toast.success("Backup codes copied!");
                            }}
                          >
                            Copy
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setAppBackupCodes([])}>
                            Done
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="border-t border-slate-200" />

              {/* Passkeys Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Passkeys</p>
                    <p className="text-xs text-muted-foreground">
                      Sign in with biometrics or a security key.
                    </p>
                  </div>
                  {!showAddPasskey && (
                    <Button size="sm" variant="outline" onClick={() => setShowAddPasskey(true)} disabled={passkeyLoading}>
                      Add Passkey
                    </Button>
                  )}
                </div>

                {showAddPasskey && (
                  <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Passkey name (optional)</Label>
                      <Input
                        placeholder='e.g. "MacBook Touch ID"'
                        value={addPasskeyName}
                        onChange={(e) => setAddPasskeyName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddPasskey()}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddPasskey} disabled={passkeyLoading}>
                        {passkeyLoading ? "Adding..." : "Register Passkey"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowAddPasskey(false); setAddPasskeyName(""); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {passkeys.length === 0 && !showAddPasskey && (
                  <p className="text-xs text-muted-foreground">No passkeys registered.</p>
                )}

                {passkeys.map((pk) => (
                  <div key={pk.id} className="flex items-center justify-between border border-slate-200 rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium">{pk.name || "Passkey"}</p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(pk.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeletePasskey(pk.id)}
                      disabled={passkeyLoading}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
