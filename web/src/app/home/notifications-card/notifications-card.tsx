"use client";

import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { useNotifications } from "./use-notifications";

export function NotificationsCard() {
  const notif = useNotifications();

  return (
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
            checked={notif.notifEnabled}
            disabled={notif.notifLoading}
            onChange={(e) => notif.updateNotifPrefs(e.target.checked, notif.notifIncludeContent)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
        {notif.notifEnabled && (
          <>
            <div className="flex items-center justify-between">
              <Label htmlFor="notif-content" className="text-sm">Include detailed content in emails</Label>
              <input
                id="notif-content"
                type="checkbox"
                checked={notif.notifIncludeContent}
                disabled={notif.notifLoading}
                onChange={(e) => notif.updateNotifPrefs(notif.notifEnabled, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            {notif.notifIncludeContent && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
                Detailed mode sends medical information (lab results, messages, X-ray images) via email.
                Make sure your email account is secure.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
