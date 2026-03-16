"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { useAppContext } from "@/lib/app-context";
import { authClient } from "@/lib/auth-client";
import { track } from "@/lib/track";

type AuthMode = "signin" | "signup";

const FEATURES = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.54-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l4.5-4.5a4.5 4.5 0 0 1 6.364 6.364l-1.757 1.757" />
      </svg>
    ),
    title: "MCP for All MyChart Data",
    description:
      "Expose 30+ health data categories as MCP tools. Connect to Claude Desktop, OpenClaw, or any MCP-compatible AI assistant and let it read your medications, labs, vitals, imaging, billing, and more.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.466.73-3.558" />
      </svg>
    ),
    title: "Works with Every MyChart",
    description:
      "Supports every Epic MyChart instance — thousands of healthcare organizations nationwide. If it runs on Epic MyChart, it works here.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
      </svg>
    ),
    title: "Send Messages with AI",
    description:
      "Let your AI assistant send messages to your care team, reply to conversations, request medication refills, and manage your health communications hands-free.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
    title: "Analyze Your Health with AI",
    description:
      "Ask your AI assistant to summarize your lab trends, check medication interactions, review your visit history, or explain your imaging results — all in natural language.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
    title: "Beyond FHIR APIs",
    description:
      "Access data that standard FHIR APIs don't expose — imaging reports with full narratives, billing claims, care journeys, questionnaires, education materials, activity feeds, and EHI exports.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
    title: "Your Data Stays Private",
    description:
      "Your MyChart credentials are encrypted at rest. Health data flows directly between your MyChart portal and your AI assistant — we don't store it.",
  },
];

const DATA_CATEGORIES = [
  "Profile",
  "Medications",
  "Allergies",
  "Lab Results",
  "Imaging",
  "Vitals",
  "Immunizations",
  "Insurance",
  "Billing",
  "Care Team",
  "Messages",
  "Visits",
  "Health Issues",
  "Referrals",
  "Medical History",
  "Preventive Care",
  "Documents",
  "Letters",
  "Goals",
  "Emergency Contacts",
  "Questionnaires",
  "Care Journeys",
  "Education Materials",
  "Activity Feed",
  "EHI Export",
  "Upcoming Orders",
  "Health Summary",
  "Visit Summaries",
  "Linked Accounts",
  "Drafts",
];

export default function LoginPage() {
  const router = useRouter();
  const ctx = useAppContext();
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);

  const isLoggedIn = !ctx.sessionLoading && !!ctx.user;

  // Redirect to home if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      router.push("/home");
    }
  }, [isLoggedIn, router]);

  // Check if Google OAuth is configured
  useEffect(() => {
    fetch("/api/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.googleOAuthEnabled) setGoogleOAuthEnabled(true);
      })
      .catch(() => {});
  }, []);

  async function handleEmailSignIn() {
    track('auth_signin_attempt', { email });
    if (!email || !password) {
      toast.error("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        track('auth_signin_failed', { email, error: result.error.message });
        toast.error(result.error.message || "Sign in failed.");
        setLoading(false);
        return;
      }
      track('auth_signin_success', { email });
      router.push("/home");
    } catch (err) {
      toast.error("Network error: " + (err as Error).message);
      setLoading(false);
    }
  }

  async function handleEmailSignUp() {
    track('auth_signup_attempt', { email, name });
    if (!email || !password || !name) {
      toast.error("Name, email, and password are required.");
      return;
    }

    setLoading(true);
    try {
      const result = await authClient.signUp.email({ email, password, name });
      if (result.error) {
        track('auth_signup_failed', { email, error: result.error.message });
        toast.error(result.error.message || "Sign up failed.");
        setLoading(false);
        return;
      }
      track('auth_signup_success', { email, name });
      router.push("/home");
    } catch (err) {
      toast.error("Network error: " + (err as Error).message);
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    track('auth_google_signin_attempt');
    setLoading(true);
    try {
      await authClient.signIn.social({ provider: "google" });
    } catch (err) {
      toast.error("Google sign in failed: " + (err as Error).message);
      setLoading(false);
    }
  }

  async function loadDemo() {
    track('demo_button_clicked');
    setLoading(true);
    ctx.setIsDemo(true);

    try {
      const res = await fetch("/api/demo", { method: "POST" });
      const data = await res.json();
      ctx.setResults(data);
      setLoading(false);
      router.push("/scrape-results");
    } catch (err) {
      toast.error("Failed to load demo: " + (err as Error).message);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">
              {authMode === "signup" ? "Creating your account..." : "Signing in..."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 sm:py-32 lg:py-40">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 text-sm text-blue-300 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
              </span>
              Open-source Claude {"<->"} MyChart connector
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1] max-w-xl">
              Manage your health data with{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Claude AI
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl">
              Connect MyChart portal to Claude (or other AI assistants).<br />
              Manage your health records, send messages, book appointments, request refills, and more all with AI.<br /><br />
              Open-source. 2 minute setup on Railway.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 items-start">
              <a 
                target="_blank"
                rel="noopener noreferrer"
                style={{ cursor: "pointer" }}
                href="https://railway.com/deploy/5F69Mf?referralCode=xrxOUg"
                >
                <Button
                  style={{ cursor: "pointer" }}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-base px-8 h-12"
                >
                  Set it up on Railway →
                </Button>
              </a>
              
              <a
                href="https://github.com/Fan-Pier-Labs/mychart-connector"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white text-base px-8 h-12 w-full"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  GitHub
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Data Categories Ticker */}
      <section className="bg-slate-50 border-y border-slate-200 py-4 overflow-hidden">
        <div className="flex animate-scroll gap-4 whitespace-nowrap">
          {[...DATA_CATEGORIES, ...DATA_CATEGORIES].map((cat, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 shrink-0"
            >
              {cat}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Everything your health portal can do, now with AI
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              We reverse-engineer the full MyChart web interface — not just the limited FHIR API — so your AI assistant gets the complete picture.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="group rounded-xl border border-slate-200 bg-white p-6 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50 transition-all duration-200"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600 mb-4 group-hover:bg-blue-100 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-slate-900 text-base mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-slate-50 py-20 sm:py-28 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Up and running in 3 steps
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "1",
                title: "Create an account",
                description: "Sign up with email or Google. Your app account is separate from your MyChart login.",
              },
              {
                step: "2",
                title: "Add your MyChart accounts",
                description: "Enter your MyChart hostname and credentials. We encrypt everything at rest and connect to your portal.",
              },
              {
                step: "3",
                title: "Talk to your health data",
                description: "Generate an MCP URL and ask your AI about medications, labs, appointments, billing — anything in your health record.",
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-lg mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-slate-900 text-base mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Auth Form */}
      <section id="get-started" className="bg-white py-20 sm:py-28 border-t border-slate-200">
        <div className="max-w-md mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              {authMode === "signin" ? "Sign in" : "Create an account"}
            </h2>
            <p className="mt-2 text-slate-500">
              {authMode === "signin"
                ? "Sign in to manage your MyChart connections."
                : "Create an account to get started."}
            </p>
          </div>
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="sr-only">
                {authMode === "signin" ? "Sign In" : "Sign Up"}
              </CardTitle>
              <CardDescription className="sr-only">
                {authMode === "signin" ? "Sign in to your account" : "Create a new account"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Google OAuth — only shown when credentials are configured */}
              {googleOAuthEnabled && (
                <>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-2 text-slate-400">or</span>
                    </div>
                  </div>
                </>
              )}

              {/* Email + Password */}
              {authMode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (authMode === "signin" ? handleEmailSignIn() : handleEmailSignUp())}
                />
              </div>

              {authMode === "signin" ? (
                <>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-500"
                    onClick={handleEmailSignIn}
                  >
                    Sign In
                  </Button>
                  <p className="text-center text-sm text-slate-500">
                    Don&apos;t have an account?{" "}
                    <button
                      className="text-blue-600 hover:underline font-medium"
                      onClick={() => setAuthMode("signup")}
                    >
                      Sign up
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="tos"
                        checked={tosAccepted}
                        onChange={(e) => setTosAccepted(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor="tos" className="text-sm font-medium leading-tight cursor-pointer">
                        I agree to the Terms of Service
                      </Label>
                    </div>
                    <ul className="text-xs text-slate-500 space-y-1 ml-6 list-disc">
                      <li>This software is provided as-is with no warranty</li>
                      <li>This is beta software and may not work or may break at any time</li>
                      <li>We are not associated with, endorsed by, or affiliated with Epic Systems or MyChart</li>
                      <li>By using this service, you agree to MyChart&apos;s Terms of Use — we will accept these on your behalf when connecting</li>
                      <li>AI is not perfect — when used to edit or update medical records (e.g. sending messages, requesting refills), it can make mistakes. Always review AI-generated actions before they are sent.</li>
                      <li>This tool is not a substitute for professional medical advice</li>
                      <li>Use at your own risk</li>
                    </ul>
                  </div>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-500"
                    onClick={handleEmailSignUp}
                    disabled={!tosAccepted}
                  >
                    Create Account
                  </Button>
                  <p className="text-center text-sm text-slate-500">
                    Already have an account?{" "}
                    <button
                      className="text-blue-600 hover:underline font-medium"
                      onClick={() => setAuthMode("signin")}
                    >
                      Sign in
                    </button>
                  </p>
                </>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-slate-400">or</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={loadDemo}
              >
                View Demo with Sample Data
              </Button>
            </CardContent>
          </Card>
          <p className="mt-4 text-center text-xs text-slate-400">
            Your MyChart credentials are encrypted at rest. Health data is not stored on our servers.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-8 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-center gap-4">
          <p className="text-sm text-slate-400">
            MyChart MCP &mdash; Open-source health data access for AI assistants
          </p>
          <a
            href="https://github.com/Fan-Pier-Labs/mychart-connector"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}
