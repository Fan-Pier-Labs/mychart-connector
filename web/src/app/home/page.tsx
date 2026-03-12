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
import { track } from "@/lib/track";

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

  // TOTP setup state
  const [totpPromptInstanceId, setTotpPromptInstanceId] = useState("");
  const [totpSetupLoading, setTotpSetupLoading] = useState(false);
  const [totpWarning, setTotpWarning] = useState(false);

  // Connecting state
  const [connectingId, setConnectingId] = useState("");

  // Notification preferences
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifIncludeContent, setNotifIncludeContent] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

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

  // Load notification preferences
  useEffect(() => {
    if (ctx.user) {
      fetch("/api/notifications/preferences")
        .then(r => r.json())
        .then(data => {
          if (typeof data.enabled === 'boolean') setNotifEnabled(data.enabled);
          if (typeof data.includeContent === 'boolean') setNotifIncludeContent(data.includeContent);
        })
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

  async function updateNotifPrefs(enabled: boolean, includeContent: boolean) {
    setNotifLoading(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, includeContent }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotifEnabled(data.enabled);
        setNotifIncludeContent(data.includeContent);
        toast.success("Notification preferences updated.");
      } else {
        toast.error(data.error || "Failed to update preferences.");
      }
    } catch (err) {
      toast.error("Network error: " + (err as Error).message);
    } finally {
      setNotifLoading(false);
    }
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
              A verification code has been sent to your email. Enter it below.
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
              onClick={() => { setTwofaSessionKey(""); setTwofaCode(""); }}
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
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sign Out
          </Button>
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

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Get notified by email when something changes in your MyChart account.
                Requires at least one account with automatic sign-in (TOTP) enabled.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notif-enabled" className="text-sm">Enable email notifications</Label>
                <input
                  id="notif-enabled"
                  type="checkbox"
                  checked={notifEnabled}
                  disabled={notifLoading}
                  onChange={(e) => updateNotifPrefs(e.target.checked, notifIncludeContent)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              {notifEnabled && (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notif-content" className="text-sm">Include detailed content in emails</Label>
                    <input
                      id="notif-content"
                      type="checkbox"
                      checked={notifIncludeContent}
                      disabled={notifLoading}
                      onChange={(e) => updateNotifPrefs(notifEnabled, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  {notifIncludeContent && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
                      Detailed mode sends medical information (lab results, messages, X-ray images) via email.
                      Make sure your email account is secure.
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
