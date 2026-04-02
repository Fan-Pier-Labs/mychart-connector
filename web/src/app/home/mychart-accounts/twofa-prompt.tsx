"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import type { useMyChartAccounts } from "./use-mychart-accounts";

type Props = Pick<ReturnType<typeof useMyChartAccounts>,
  "twofaCode" | "setTwofaCode" | "twofaLoading" | "twofaDelivery" | "handle2fa" | "cancel2fa"
>;

export function TwofaPrompt(props: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            {props.twofaDelivery?.method === "sms"
              ? `A verification code has been sent via text message${props.twofaDelivery.contact ? ` to ${props.twofaDelivery.contact}` : ""}. Enter it below.`
              : `A verification code has been sent to your email${props.twofaDelivery?.contact ? ` (${props.twofaDelivery.contact})` : ""}. Enter it below.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="twofa">2FA Code</Label>
            <Input
              id="twofa"
              placeholder="6-digit code"
              maxLength={10}
              value={props.twofaCode}
              onChange={(e) => props.setTwofaCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && props.handle2fa()}
              autoFocus
            />
          </div>
          <Button
            className="w-full"
            onClick={props.handle2fa}
            disabled={props.twofaLoading}
          >
            {props.twofaLoading ? "Verifying..." : "Submit Code"}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={props.cancel2fa}
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
