"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAppContext } from "@/lib/app-context";
import { fetchNotifPrefs, updateNotifPrefs as updateNotifPrefsApi } from "./api";

export function useNotifications() {
  const ctx = useAppContext();
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifIncludeContent, setNotifIncludeContent] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    if (ctx.user) {
      fetchNotifPrefs()
        .then(prefs => {
          if (prefs) {
            setNotifEnabled(prefs.enabled);
            setNotifIncludeContent(prefs.includeContent);
          }
        })
        .catch(() => {});
    }
  }, [ctx.user]);

  async function updateNotifPrefs(enabled: boolean, includeContent: boolean) {
    // Enabling notifications strips the client-side encryption layer so the
    // server can decrypt credentials on its own schedule. Warn the user.
    if (enabled && !notifEnabled) {
      const ok = window.confirm(
        "Enabling email notifications disables client-side encryption so the server can check your MyChart account on its own. Your credentials will still be encrypted on disk with the server key. Continue?",
      );
      if (!ok) return;
    }
    setNotifLoading(true);
    try {
      const result = await updateNotifPrefsApi(enabled, includeContent);
      if (result.ok) {
        setNotifEnabled(result.prefs.enabled);
        setNotifIncludeContent(result.prefs.includeContent);
        toast.success("Notification preferences updated.");
      } else {
        toast.error(result.error);
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
