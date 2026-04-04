"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAppContext } from "@/lib/app-context";
import { authClient } from "@/lib/auth-client";
import { validateChangePassword } from "@/lib/change-password";

export function useSecurity() {
  const ctx = useAppContext();

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

  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordCurrent, setChangePasswordCurrent] = useState("");
  const [changePasswordNew, setChangePasswordNew] = useState("");
  const [changePasswordConfirm, setChangePasswordConfirm] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

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
      const name = `openrecord-${ctx.user?.email || "unknown"}`;
      const result = await authClient.passkey.addPasskey({ name });
      if (result?.error) {
        toast.error(result.error.message || "Failed to add passkey.");
        setPasskeyLoading(false);
        return;
      }
      toast.success("Passkey added!");
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

  async function handleChangePassword() {
    const validationError = validateChangePassword(changePasswordCurrent, changePasswordNew, changePasswordConfirm);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setChangePasswordLoading(true);
    try {
      const result = await authClient.changePassword({
        currentPassword: changePasswordCurrent,
        newPassword: changePasswordNew,
        revokeOtherSessions: true,
      });
      if (result?.error) {
        toast.error(result.error.message || "Failed to change password.");
        setChangePasswordLoading(false);
        return;
      }
      toast.success("Password changed successfully.");
      setShowChangePassword(false);
      setChangePasswordCurrent("");
      setChangePasswordNew("");
      setChangePasswordConfirm("");
    } catch (err) {
      toast.error("Failed: " + (err as Error).message);
    } finally {
      setChangePasswordLoading(false);
    }
  }

  function startTotpPrompt() {
    setAppTotpPasswordPrompt(ctx.user?.twoFactorEnabled ? "disable" : "enable");
    setAppTotpPassword("");
  }

  function cancelTotpPrompt() {
    setAppTotpPasswordPrompt(null);
    setAppTotpPassword("");
  }

  function cancelTotpSetup() {
    setAppTotpURI("");
    setAppBackupCodes([]);
    setAppTotpVerifyCode("");
  }

  function cancelChangePassword() {
    setShowChangePassword(false);
    setChangePasswordCurrent("");
    setChangePasswordNew("");
    setChangePasswordConfirm("");
  }

  return {
    // TOTP
    appTotpLoading,
    appTotpURI,
    appBackupCodes, setAppBackupCodes,
    appTotpVerifyCode, setAppTotpVerifyCode,
    appTotpPasswordPrompt,
    appTotpPassword, setAppTotpPassword,
    backupCodesPassword, setBackupCodesPassword,
    showBackupCodesPrompt, setShowBackupCodesPrompt,
    handleEnableTotp,
    handleVerifyTotpSetup,
    handleDisableTotp,
    handleRegenerateBackupCodes,
    startTotpPrompt,
    cancelTotpPrompt,
    cancelTotpSetup,

    // Passkeys
    passkeys,
    passkeyLoading,
    handleAddPasskey,
    handleDeletePasskey,

    // Change password
    showChangePassword, setShowChangePassword,
    changePasswordCurrent, setChangePasswordCurrent,
    changePasswordNew, setChangePasswordNew,
    changePasswordConfirm, setChangePasswordConfirm,
    changePasswordLoading,
    handleChangePassword,
    cancelChangePassword,
  };
}
