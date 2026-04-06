"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { useAppContext } from "@/lib/app-context";
import type { useMyChartAccounts } from "./use-mychart-accounts";

type Props = ReturnType<typeof useMyChartAccounts>;

export function MyChartAccountsCard(props: Props) {
  const ctx = useAppContext();

  return (
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
            onClick={() => props.setShowAddForm(!props.showAddForm)}
          >
            {props.showAddForm ? "Cancel" : "Add Account"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add form */}
        {props.showAddForm && (
          <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-hostname" className="text-xs">MyChart Hostname</Label>
                <Input
                  id="new-hostname"
                  placeholder="e.g. mychart.example.org"
                  value={props.newHostname}
                  onChange={(e) => props.setNewHostname(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-username" className="text-xs">Username</Label>
                <Input
                  id="new-username"
                  placeholder="MyChart username"
                  value={props.newUsername}
                  onChange={(e) => props.setNewUsername(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-xs">Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="MyChart password"
                  value={props.newPassword}
                  onChange={(e) => props.setNewPassword(e.target.value)}
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={props.addInstance}
              disabled={props.addLoading}
            >
              {props.addLoading ? "Adding..." : "Add MyChart Account"}
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
        {!ctx.sessionLoading && ctx.instances.length === 0 && !props.showAddForm && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No MyChart accounts added yet. Click &quot;Add Account&quot; to get started.
          </p>
        )}

        {ctx.instances.map((inst) => {
          const isActive = ctx.activeInstanceId === inst.id && inst.connected;
          const isConnecting = props.connectingId === inst.id;

          return (
            <div
              key={inst.id}
              className={`flex items-center justify-between border rounded-lg p-4 ${
                !inst.enabled ? "border-slate-200 bg-slate-50 opacity-60" :
                isActive ? "border-blue-300 bg-blue-50" : "border-slate-200"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex h-2 w-2 rounded-full ${
                    !inst.enabled ? "bg-slate-300" :
                    inst.connected ? "bg-green-500" : "bg-slate-300"
                  }`} />
                  <p className="font-medium text-sm truncate">{inst.hostname}</p>
                  {!inst.enabled && (
                    <span className="text-xs text-slate-400 font-medium">Disabled</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {inst.username}
                  {inst.hasTotpSecret && " (TOTP)"}
                  {inst.hasPasskeyCredential && " (Passkey)"}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {inst.enabled && inst.connected && !inst.hasPasskeyCredential && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => props.setupPasskey(inst.id)}
                    disabled={props.passkeySetupLoading === inst.id}
                  >
                    {props.passkeySetupLoading === inst.id ? "Setting up..." : "Setup Passkey"}
                  </Button>
                )}
                {inst.enabled && inst.hasPasskeyCredential && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                    onClick={() => props.removePasskey(inst.id)}
                    disabled={props.passkeySetupLoading === inst.id}
                  >
                    {props.passkeySetupLoading === inst.id ? "Removing..." : "Remove Passkey"}
                  </Button>
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={inst.enabled}
                  aria-label={inst.enabled ? "Disable account" : "Enable account"}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    inst.enabled ? "bg-blue-600" : "bg-slate-200"
                  }`}
                  onClick={() => props.toggleInstance(inst.id, !inst.enabled)}
                >
                  <span
                    className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                      inst.enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                {inst.enabled && !inst.connected ? (
                  <Button
                    size="sm"
                    onClick={() => props.connectInstance(inst)}
                    disabled={isConnecting}
                  >
                    {isConnecting ? "Connecting..." : "Connect"}
                  </Button>
                ) : inst.enabled && isActive ? (
                  <span className="text-xs text-blue-600 font-medium">Active</span>
                ) : inst.enabled && inst.connected ? (
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
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => props.deleteInstance(inst.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
