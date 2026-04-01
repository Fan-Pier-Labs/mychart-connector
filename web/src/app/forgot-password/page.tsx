"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const emailValue = email || (document.getElementById("email") as HTMLInputElement)?.value || "";
    if (!emailValue) {
      toast.error("Please enter your email address.");
      return;
    }
    if (!email) setEmail(emailValue);
    setLoading(true);
    try {
      const { error } = await authClient.requestPasswordReset({
        email: emailValue,
        redirectTo: "/reset-password",
      });
      if (error) {
        toast.error(error.message || "Failed to send reset email.");
        setLoading(false);
        return;
      }
      setSent(true);
    } catch (err) {
      toast.error("Network error: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            {sent
              ? "Check your email for a reset link."
              : "Enter the email address associated with your account and we'll send you a link to reset your password."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-slate-500">
                If an account exists for <strong>{email}</strong>, you&apos;ll receive a password reset email shortly.
              </p>
              <a
                href="/login"
                className="inline-block text-sm text-blue-600 hover:underline font-medium"
              >
                Back to sign in
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <p className="text-center text-sm text-slate-500">
                Remember your password?{" "}
                <a href="/login" className="text-blue-600 hover:underline font-medium">
                  Sign in
                </a>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
