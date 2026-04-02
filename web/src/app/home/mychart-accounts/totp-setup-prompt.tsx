"use client";

import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import type { useMyChartAccounts } from "./use-mychart-accounts";

type Props = Pick<ReturnType<typeof useMyChartAccounts>,
  "totpSetupLoading" | "totpWarning" | "totpErrorMessage" | "handleTotpSetup" | "handleTotpSkip" | "handleTotpContinueAnyway" | "handleTotpRetry"
>;

export function TotpSetupPrompt(props: Props) {
  if (props.totpSetupLoading) {
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

  if (props.totpWarning) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-amber-200">
          <CardHeader>
            <CardTitle className="text-amber-700">2FA not configured</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {props.totpErrorMessage && (
              <p className="text-sm text-red-600 font-medium">
                {props.totpErrorMessage}
              </p>
            )}
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
                onClick={props.handleTotpRetry}
              >
                Retry
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={props.handleTotpContinueAnyway}
              >
                Continue anyway
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              onClick={props.handleTotpSkip}
            >
              Skip
            </Button>
            <Button
              className="flex-1"
              onClick={props.handleTotpSetup}
            >
              Enable
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
