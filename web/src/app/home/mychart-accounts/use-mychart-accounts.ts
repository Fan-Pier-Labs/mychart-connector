"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAppContext, type MyChartInstanceInfo } from "@/lib/app-context";
import { track } from "@/lib/track";

export function useMyChartAccounts() {
  const ctx = useAppContext();

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

  useEffect(() => {
    if (ctx.activeSessionKey && !ctx.profile) {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.activeSessionKey]);

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
    track("instance_added");
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

  async function toggleInstance(id: string, enabled: boolean) {
    try {
      const res = await fetch(`/api/mychart-instances/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update instance.");
        return;
      }
      await ctx.refreshInstances();
      toast.success(enabled ? "Account enabled." : "Account disabled.");
    } catch (err) {
      toast.error("Network error: " + (err as Error).message);
    }
  }

  async function deleteInstance(id: string) {
    track("instance_deleted");
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

  function cancel2fa() {
    setTwofaSessionKey("");
    setTwofaCode("");
    setTwofaDelivery(null);
  }

  return {
    // Add form
    showAddForm, setShowAddForm,
    newHostname, setNewHostname,
    newUsername, setNewUsername,
    newPassword, setNewPassword,
    addLoading,
    addInstance,

    // 2FA
    twofaSessionKey,
    twofaCode, setTwofaCode,
    twofaLoading,
    twofaDelivery,
    handle2fa,
    cancel2fa,

    // TOTP setup
    totpPromptInstanceId,
    totpSetupLoading,
    totpWarning,
    handleTotpSetup,
    handleTotpSkip,
    handleTotpContinueAnyway,
    handleTotpRetry,

    // Connection
    connectingId,
    connectInstance,

    // Instance management
    toggleInstance,
    deleteInstance,
  };
}
