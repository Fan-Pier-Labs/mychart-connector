"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAppContext } from "@/lib/app-context";
import { track } from "@/lib/track";
import { getOrCreateCek } from "@/lib/client-encryption-key";

export function useMcp() {
  const ctx = useAppContext();
  const [mcpLoading, setMcpLoading] = useState(false);
  const [mcpCopied, setMcpCopied] = useState(false);
  const [mcpSslCopied, setMcpSslCopied] = useState(false);
  const [mcpKeyGenerated, setMcpKeyGenerated] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  useEffect(() => {
    if (ctx.user) {
      fetch("/api/mcp-key")
        .then(r => r.json())
        .then(data => { if (data.hasKey) setHasExistingKey(true); })
        .catch(() => {});
    }
  }, [ctx.user]);

  async function generateApiKey() {
    track("mcp_key_generated");
    setMcpLoading(true);
    try {
      const res = await fetch("/api/mcp-key", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        const cek = getOrCreateCek();
        const mcpUrl = `${window.location.origin}/api/mcp?key=${data.key}.${cek}`;
        ctx.setMcpUrl(mcpUrl);
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

  return {
    mcpLoading,
    mcpCopied,
    mcpSslCopied,
    mcpKeyGenerated,
    hasExistingKey,
    generateApiKey,
    revokeApiKey,
    copyMcpUrl,
    copyMcpSslUrl,
  };
}
