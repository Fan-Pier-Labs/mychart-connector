"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { useAppContext } from "@/lib/app-context";
import { QRCodeSVG } from "qrcode.react";
import { useSecurity } from "./use-security";

export function SecurityCard() {
  const ctx = useAppContext();
  const sec = useSecurity();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>
          Manage your password, two-factor authentication, and passkeys.
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
            {!sec.appTotpURI && !sec.appTotpPasswordPrompt && (
              <Button
                size="sm"
                variant={ctx.user?.twoFactorEnabled ? "destructive" : "default"}
                onClick={sec.startTotpPrompt}
                disabled={sec.appTotpLoading}
              >
                {ctx.user?.twoFactorEnabled ? "Disable" : "Enable"}
              </Button>
            )}
          </div>

          {/* Password prompt for enable/disable */}
          {sec.appTotpPasswordPrompt && !sec.appTotpURI && (
            <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
              <p className="text-sm text-muted-foreground">
                Enter your password to {sec.appTotpPasswordPrompt === "enable" ? "enable" : "disable"} two-factor authentication.
              </p>
              <Input
                type="password"
                placeholder="Password"
                value={sec.appTotpPassword}
                onChange={(e) => sec.setAppTotpPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (sec.appTotpPasswordPrompt === "enable" ? sec.handleEnableTotp() : sec.handleDisableTotp())}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={sec.appTotpPasswordPrompt === "enable" ? sec.handleEnableTotp : sec.handleDisableTotp}
                  disabled={sec.appTotpLoading}
                >
                  {sec.appTotpLoading ? "Processing..." : "Confirm"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={sec.cancelTotpPrompt}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* TOTP setup flow — QR code + verify */}
          {sec.appTotpURI && (
            <div className="border border-slate-200 rounded-lg p-4 space-y-4 bg-slate-50">
              <p className="text-sm font-medium">Scan this QR code with your authenticator app</p>
              <div className="flex justify-center">
                <QRCodeSVG value={sec.appTotpURI} size={200} />
              </div>
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Can&apos;t scan? Show manual entry key
                </summary>
                <code className="block mt-2 p-2 bg-white rounded border text-xs break-all">
                  {sec.appTotpURI}
                </code>
              </details>

              {sec.appBackupCodes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-700">Save your backup codes</p>
                  <p className="text-xs text-muted-foreground">
                    Store these codes somewhere safe. Each code can only be used once.
                  </p>
                  <div className="grid grid-cols-2 gap-1 p-3 bg-white rounded border font-mono text-xs">
                    {sec.appBackupCodes.map((code, i) => (
                      <span key={i}>{code}</span>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(sec.appBackupCodes.join("\n"));
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
                  value={sec.appTotpVerifyCode}
                  onChange={(e) => sec.setAppTotpVerifyCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sec.handleVerifyTotpSetup()}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={sec.handleVerifyTotpSetup}
                    disabled={sec.appTotpLoading}
                  >
                    {sec.appTotpLoading ? "Verifying..." : "Verify & Enable"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={sec.cancelTotpSetup}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Regenerate backup codes */}
          {ctx.user?.twoFactorEnabled && !sec.appTotpURI && !sec.appTotpPasswordPrompt && (
            <>
              {!sec.showBackupCodesPrompt && sec.appBackupCodes.length === 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sec.setShowBackupCodesPrompt(true)}
                >
                  Regenerate Backup Codes
                </Button>
              )}
              {sec.showBackupCodesPrompt && (
                <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
                  <p className="text-sm text-muted-foreground">Enter your password to generate new backup codes.</p>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={sec.backupCodesPassword}
                    onChange={(e) => sec.setBackupCodesPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sec.handleRegenerateBackupCodes()}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={sec.handleRegenerateBackupCodes} disabled={sec.appTotpLoading}>
                      {sec.appTotpLoading ? "Generating..." : "Generate"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { sec.setShowBackupCodesPrompt(false); sec.setBackupCodesPassword(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {sec.appBackupCodes.length > 0 && !sec.appTotpURI && (
                <div className="border border-slate-200 rounded-lg p-4 space-y-2 bg-slate-50">
                  <p className="text-sm font-medium text-amber-700">Your new backup codes</p>
                  <p className="text-xs text-muted-foreground">Store these codes somewhere safe. Each code can only be used once.</p>
                  <div className="grid grid-cols-2 gap-1 p-3 bg-white rounded border font-mono text-xs">
                    {sec.appBackupCodes.map((code, i) => (
                      <span key={i}>{code}</span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(sec.appBackupCodes.join("\n"));
                        toast.success("Backup codes copied!");
                      }}
                    >
                      Copy
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => sec.setAppBackupCodes([])}>
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
            <Button size="sm" variant="outline" onClick={sec.handleAddPasskey} disabled={sec.passkeyLoading}>
                {sec.passkeyLoading ? "Adding..." : "Add Passkey"}
              </Button>
          </div>

          {sec.passkeys.length === 0 && (
            <p className="text-xs text-muted-foreground">No passkeys registered.</p>
          )}

          {sec.passkeys.map((pk) => (
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
                onClick={() => sec.handleDeletePasskey(pk.id)}
                disabled={sec.passkeyLoading}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200" />

        {/* Change Password Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">
                Change your account password.
              </p>
            </div>
            {!sec.showChangePassword && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => sec.setShowChangePassword(true)}
              >
                Change Password
              </Button>
            )}
          </div>

          {sec.showChangePassword && (
            <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
              <div className="space-y-2">
                <Label className="text-xs">Current Password</Label>
                <Input
                  type="password"
                  placeholder="Current password"
                  value={sec.changePasswordCurrent}
                  onChange={(e) => sec.setChangePasswordCurrent(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">New Password</Label>
                <Input
                  type="password"
                  placeholder="New password (min 8 characters)"
                  value={sec.changePasswordNew}
                  onChange={(e) => sec.setChangePasswordNew(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Confirm New Password</Label>
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={sec.changePasswordConfirm}
                  onChange={(e) => sec.setChangePasswordConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sec.handleChangePassword()}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={sec.handleChangePassword}
                  disabled={sec.changePasswordLoading}
                >
                  {sec.changePasswordLoading ? "Changing..." : "Update Password"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={sec.cancelChangePassword}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
