"use client";

import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import type { useMyChartAccounts } from "./use-mychart-accounts";

type Props = Pick<ReturnType<typeof useMyChartAccounts>,
  "passkeyPromptLoading" | "passkeyPromptWarning" | "passkeyPromptError" | "handlePasskeyPromptSetup" | "handlePasskeyPromptSkip" | "handlePasskeyPromptContinueAnyway" | "handlePasskeyPromptRetry"
>;

export function PasskeySetupPrompt(props: Props) {
  if (props.passkeyPromptLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Setting up automatic sign-in...</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">Configuring passkey for your MyChart account. This only takes a few seconds.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (props.passkeyPromptWarning) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-amber-200">
          <CardHeader>
            <CardTitle className="text-amber-700">Passkey not configured</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {props.passkeyPromptError && (
              <p className="text-sm text-red-600 font-medium">
                {props.passkeyPromptError}
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
                onClick={props.handlePasskeyPromptRetry}
              >
                Retry
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={props.handlePasskeyPromptContinueAnyway}
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
            automatically. We&apos;ll set up a passkey so the agent can log in
            without requiring email codes each time.
          </p>
          <p className="text-sm text-muted-foreground">
            This registers a passkey on your MyChart account.
            You can remove it anytime from your MyChart security settings.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={props.handlePasskeyPromptSkip}
            >
              Skip
            </Button>
            <Button
              className="flex-1"
              onClick={props.handlePasskeyPromptSetup}
            >
              Enable
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
