"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAppContext } from "@/lib/app-context";

export function useNotifications() {
  const ctx = useAppContext();
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifIncludeContent, setNotifIncludeContent] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    if (ctx.user) {
      fetch("/api/notifications/preferences")
        .then(r => r.json())
        .then(data => {
          if (typeof data.enabled === "boolean") setNotifEnabled(data.enabled);
          if (typeof data.includeContent === "boolean") setNotifIncludeContent(data.includeContent);
        })
        .catch(() => {});
    }
  }, [ctx.user]);

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

  return {
    notifEnabled,
    notifIncludeContent,
    notifLoading,
    updateNotifPrefs,
  };
}
