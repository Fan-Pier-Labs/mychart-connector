"use client";

import { useState, useEffect, useRef } from "react";
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
import { Icon } from "@iconify/react";
import { WebGLBackground } from "@/components/landing/webgl-background";
import { PhoneMockup } from "@/components/landing/phone-mockup";

type AuthMode = "signin" | "signup";
type TwoFactorMode = "totp" | "backup";

const DATA_CATEGORIES = [
  "Profile", "Medications", "Allergies", "Lab Results", "Imaging",
  "Vitals", "Immunizations", "Insurance", "Billing", "Care Team",
  "Messages", "Visits", "Health Issues", "Referrals", "Medical History",
  "Preventive Care", "Documents", "Letters", "Goals", "Emergency Contacts",
  "Questionnaires", "Care Journeys", "Education Materials", "Activity Feed",
  "EHI Export", "Upcoming Orders", "Health Summary", "Visit Summaries",
  "Linked Accounts", "Drafts",
];

const FEATURES = [
  {
    icon: "solar:database-linear",
    title: "MCP for All MyChart Data",
    description: "Expose 30+ health data categories as MCP tools. Connect to Claude Desktop, OpenClaw, or any MCP-compatible AI assistant and let it read your medications, labs, vitals, imaging, billing, and more.",
    span: "md:col-span-2",
    visual: (
      <div className="mt-8 bg-white/60 border border-white/80 rounded-2xl p-5 relative overflow-hidden shadow-sm flex items-center gap-6 h-32">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Icon icon="solar:folder-with-files-linear" width={16} height={16} className="text-slate-400" />
            <div className="h-2 w-24 bg-slate-300 rounded-full" />
          </div>
          <div className="flex items-center gap-2 pl-6">
            <Icon icon="solar:file-text-linear" width={16} height={16} className="text-blue-400" />
            <div className="h-2 w-32 bg-slate-200 rounded-full" />
          </div>
          <div className="flex items-center gap-2 pl-6">
            <Icon icon="solar:file-text-linear" width={16} height={16} className="text-emerald-400" />
            <div className="h-2 w-20 bg-slate-200 rounded-full" />
          </div>
        </div>
        <div className="hidden sm:flex flex-1 items-center justify-center">
          <Icon icon="solar:arrow-right-linear" width={24} height={24} className="text-slate-300" />
        </div>
        <div className="flex-1 bg-slate-900 rounded-xl p-4 flex items-center justify-center shadow-lg relative overflow-hidden group-hover:scale-[1.02] transition-transform">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:10px_10px]" />
          <span className="text-white font-mono text-xs z-10">get_lab_results()</span>
        </div>
      </div>
    ),
  },
  {
    icon: "solar:buildings-linear",
    title: "Works with Every MyChart",
    description: "Supports every Epic MyChart instance — thousands of healthcare organizations nationwide. If it runs on Epic, it works here.",
    visual: (
      <div className="mt-8 w-full h-32 relative flex items-center justify-center">
        <div className="absolute w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-20 group-hover:scale-110 transition-transform">
          <Icon icon="solar:hospital-linear" width={32} height={32} className="text-blue-500" />
        </div>
        <div className="absolute w-full h-px bg-slate-200" />
        <div className="absolute left-4 w-2 h-2 rounded-full bg-slate-300" />
        <div className="absolute right-4 w-2 h-2 rounded-full bg-slate-300" />
      </div>
    ),
  },
  {
    icon: "solar:chat-round-linear",
    title: "Send Messages with AI",
    description: "Let your AI assistant send messages to your care team, reply to conversations, request medication refills, and manage communications hands-free.",
    visual: (
      <div className="mt-8 bg-white/50 border border-white/60 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="w-2/3 h-8 bg-slate-200/60 rounded-xl rounded-tl-sm ml-auto" />
        <div className="w-3/4 h-12 bg-blue-50 rounded-xl rounded-tr-sm border border-blue-100 relative overflow-hidden group-hover:bg-blue-100/50 transition-colors">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400">
            <Icon icon="solar:pen-linear" width={16} height={16} />
          </div>
          <div className="absolute left-9 top-1/2 -translate-y-1/2 h-2 w-1/2 bg-blue-200/60 rounded-full" />
        </div>
      </div>
    ),
  },
  {
    icon: "solar:chart-square-linear",
    title: "Analyze Your Health with AI",
    description: "Ask your AI assistant to summarize your lab trends, check medication interactions, review your visit history, or explain your imaging results — all in natural language.",
    span: "md:col-span-2",
    visual: (
      <div className="mt-8 flex items-end gap-2 h-28 bg-white/40 border border-white/60 rounded-2xl p-4 shadow-inner relative group-hover:bg-white/60 transition-colors">
        <div className="absolute top-4 left-4 flex gap-1.5 items-center">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.4)] animate-pulse" />
          <span className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase">Lab Trends</span>
        </div>
        <div className="w-full flex items-end gap-2 h-16 relative z-10 px-2">
          <div className="flex-1 bg-blue-400/20 rounded-t-sm h-[40%] group-hover:h-[45%] transition-all duration-500" />
          <div className="flex-1 bg-blue-400/30 rounded-t-sm h-[50%] group-hover:h-[60%] transition-all duration-500" />
          <div className="flex-1 bg-blue-400/20 rounded-t-sm h-[45%] group-hover:h-[40%] transition-all duration-500" />
          <div className="flex-1 bg-blue-400/40 rounded-t-sm h-[70%] group-hover:h-[80%] transition-all duration-500" />
          <div className="flex-1 bg-emerald-400/60 rounded-t-sm h-[90%] group-hover:h-[100%] transition-all duration-500 relative">
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
          <div className="flex-1 bg-blue-400/30 rounded-t-sm h-[60%] group-hover:h-[50%] transition-all duration-500" />
        </div>
      </div>
    ),
  },
  {
    icon: "solar:documents-linear",
    title: "Beyond FHIR APIs",
    description: "Access data that standard FHIR APIs don't expose — imaging reports with full narratives, billing claims, care journeys, questionnaires, education materials, activity feeds, and EHI exports.",
    span: "md:col-span-2",
    visual: (
      <div className="mt-8 flex gap-4 h-32 relative">
        <div className="w-24 bg-white/60 border border-white/80 rounded-xl p-3 shadow-sm transform group-hover:-translate-y-2 group-hover:-rotate-3 transition-transform duration-500 relative z-20">
          <div className="w-6 h-6 rounded bg-slate-100 mb-3 flex items-center justify-center">
            <Icon icon="solar:file-text-linear" width={14} height={14} />
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full mb-1.5" />
          <div className="h-1.5 w-2/3 bg-slate-200 rounded-full" />
        </div>
        <div className="w-24 bg-white/60 border border-white/80 rounded-xl p-3 shadow-sm transform group-hover:-translate-y-4 transition-transform duration-500 delay-75 relative z-10">
          <div className="w-6 h-6 rounded bg-blue-50 text-blue-500 mb-3 flex items-center justify-center">
            <Icon icon="solar:gallery-linear" width={14} height={14} />
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full mb-1.5" />
          <div className="h-1.5 w-3/4 bg-slate-200 rounded-full" />
        </div>
        <div className="w-24 bg-white/60 border border-white/80 rounded-xl p-3 shadow-sm transform group-hover:-translate-y-2 group-hover:rotate-3 transition-transform duration-500 delay-150">
          <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-500 mb-3 flex items-center justify-center">
            <Icon icon="solar:dollar-minimalistic-linear" width={14} height={14} />
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full mb-1.5" />
          <div className="h-1.5 w-1/2 bg-slate-200 rounded-full" />
        </div>
      </div>
    ),
  },
  {
    icon: "solar:shield-check-linear",
    title: "Your Data Stays Private",
    description: "Your MyChart credentials are encrypted at rest. Health data flows directly between your MyChart portal and your AI assistant — we don't store it.",
    visual: (
      <div className="mt-8 flex items-center justify-center h-28 relative">
        <div className="absolute w-24 h-24 bg-emerald-400/10 rounded-full blur-xl group-hover:bg-emerald-400/20 transition-colors" />
        <div className="w-16 h-16 bg-white border border-slate-200 rounded-full shadow-md flex items-center justify-center z-10 group-hover:scale-110 transition-transform duration-500">
          <Icon icon="solar:lock-password-linear" width={28} height={28} className="text-emerald-500" />
        </div>
      </div>
    ),
  },
];

const STEPS = [
  {
    icon: "solar:user-circle-linear",
    title: "Create an account",
    description: "Sign up with email or Google. Your app account is separate from your MyChart login to maintain privacy boundaries.",
  },
  {
    icon: "solar:link-circle-linear",
    title: "Add your MyChart accounts",
    description: "Enter your MyChart hostname and credentials. We encrypt everything at rest and establish a secure connection to your portal.",
  },
  {
    icon: "solar:magic-stick-3-linear",
    title: "Talk to your health data",
    description: "Generate an MCP URL and ask your AI about medications, labs, appointments, billing — anything in your health record.",
  },
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
  const [twoFactorPending, setTwoFactorPending] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [twoFactorMode, setTwoFactorMode] = useState<TwoFactorMode>("totp");
  const [showModal, setShowModal] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [showMagicLinkInput, setShowMagicLinkInput] = useState(false);
  const [modalStep, setModalStep] = useState<"choose" | "signin">("choose");
  const timelineSectionRef = useRef<HTMLElement>(null);

  const isLoggedIn = !ctx.sessionLoading && !!ctx.user;

  useEffect(() => {
    if (isLoggedIn) {
      router.push("/home");
    }
  }, [isLoggedIn, router]);

  useEffect(() => {
    fetch("/api/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.googleOAuthEnabled) setGoogleOAuthEnabled(true);
      })
      .catch(() => {});
  }, []);

  // Timeline intersection observer
  useEffect(() => {
    const section = timelineSectionRef.current;
    if (!section) return;
    const steps = Array.from(section.querySelectorAll(".tl-step"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (entry.target === section) {
            section.classList.add("is-inview");
            return;
          }
          const el = entry.target as HTMLElement;
          const idx = steps.indexOf(el);
          el.style.transitionDelay = Math.min(idx * 120, 360) + "ms";
          el.classList.add("is-inview");
          io.unobserve(el);
        });
      },
      { threshold: 0.28, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(section);
    steps.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  async function handleEmailSignIn() {
    track("auth_signin_attempt", { email });
    if (!email || !password) {
      toast.error("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        track("auth_signin_failed", { email, error: result.error.message });
        toast.error(result.error.message || "Sign in failed.");
        setLoading(false);
        return;
      }
      if (result.data?.twoFactorRedirect) {
        track("auth_signin_2fa_required", { email });
        setTwoFactorPending(true);
        setShowModal(false);
        setLoading(false);
        return;
      }
      track("auth_signin_success", { email });
      router.push("/home");
    } catch (err) {
      toast.error("Network error: " + (err as Error).message);
      setLoading(false);
    }
  }

  async function handleTotpVerify() {
    if (!totpCode) {
      toast.error("Enter a verification code.");
      return;
    }
    setLoading(true);
    try {
      if (twoFactorMode === "backup") {
        const result = await authClient.twoFactor.verifyBackupCode({ code: totpCode });
        if (result.error) {
          toast.error(result.error.message || "Invalid backup code.");
          setLoading(false);
          return;
        }
      } else {
        const result = await authClient.twoFactor.verifyTotp({ code: totpCode });
        if (result.error) {
          toast.error(result.error.message || "Invalid code.");
          setLoading(false);
          return;
        }
      }
      track('auth_signin_2fa_success', { email });
      router.push("/home");
    } catch (err) {
      toast.error("Verification failed: " + (err as Error).message);
      setLoading(false);
    }
  }

  async function handlePasskeySignIn() {
    track('auth_passkey_signin_attempt');
    setLoading(true);
    try {
      const result = await authClient.signIn.passkey();
      if (result?.error) {
        toast.error(result.error.message || "Passkey sign-in failed.");
        setLoading(false);
        return;
      }
      track('auth_passkey_signin_success');
      router.push("/home");
    } catch (err) {
      toast.error("Passkey sign-in failed: " + (err as Error).message);
      setLoading(false);
    }
  }

  async function handleEmailSignUp() {
    track("auth_signup_attempt", { email, name });
    if (!email || !password || !name) {
      toast.error("Name, email, and password are required.");
      return;
    }
    setLoading(true);
    try {
      const result = await authClient.signUp.email({ email, password, name });
      if (result.error) {
        track("auth_signup_failed", { email, error: result.error.message });
        toast.error(result.error.message || "Sign up failed.");
        setLoading(false);
        return;
      }
      track("auth_signup_success", { email, name });
      router.push("/home");
    } catch (err) {
      toast.error("Network error: " + (err as Error).message);
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    track("auth_google_signin_attempt");
    setLoading(true);
    try {
      await authClient.signIn.social({ provider: "google", callbackURL: "/home" });
    } catch (err) {
      toast.error("Google sign in failed: " + (err as Error).message);
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!magicLinkEmail) {
      toast.error("Enter your email address.");
      return;
    }
    track("auth_magic_link_attempt", { email: magicLinkEmail });
    setLoading(true);
    try {
      const result = await authClient.signIn.magicLink({ email: magicLinkEmail, callbackURL: "/home" });
      if (result.error) {
        track("auth_magic_link_failed", { email: magicLinkEmail, error: result.error.message });
        toast.error(result.error.message || "Failed to send magic link.");
        setLoading(false);
        return;
      }
      track("auth_magic_link_sent", { email: magicLinkEmail });
      setMagicLinkSent(true);
      setLoading(false);
    } catch (err) {
      toast.error("Failed to send magic link: " + (err as Error).message);
      setLoading(false);
    }
  }

  async function loadDemo() {
    track("demo_button_clicked");
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

  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a sign-in link to <strong>{magicLinkEmail}</strong>. Click the link in the email to sign in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <Icon icon="solar:letter-linear" width={48} height={48} className="text-blue-500" />
            </div>
            <p className="text-sm text-center text-slate-500">
              Didn&apos;t receive it? Check your spam folder or try again.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setMagicLinkSent(false);
                setMagicLinkEmail("");
              }}
            >
              Back to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (twoFactorPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>
              {twoFactorMode === "backup"
                ? "Enter one of your backup codes."
                : "Enter the 6-digit code from your authenticator app."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="totp-code">
                {twoFactorMode === "backup" ? "Backup Code" : "Verification Code"}
              </Label>
              <Input
                id="totp-code"
                placeholder={twoFactorMode === "backup" ? "Backup code" : "6-digit code"}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTotpVerify()}
                autoFocus
              />
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-500" onClick={handleTotpVerify}>
              Verify
            </Button>
            <div className="flex items-center justify-between">
              <button
                className="text-sm text-blue-600 hover:underline"
                onClick={() => {
                  setTwoFactorMode(twoFactorMode === "totp" ? "backup" : "totp");
                  setTotpCode("");
                }}
              >
                {twoFactorMode === "totp" ? "Use backup code" : "Use authenticator code"}
              </button>
              <button
                className="text-sm text-slate-500 hover:underline"
                onClick={() => {
                  setTwoFactorPending(false);
                  setTotpCode("");
                  setTwoFactorMode("totp");
                }}
              >
                Cancel
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-900" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <WebGLBackground />

      {/* Fixed Glass Header */}
      <header className="fixed top-4 left-0 w-full z-50 px-4 sm:px-6 pointer-events-none">
        <div className="max-w-6xl mx-auto pointer-events-auto">
          <div className="relative backdrop-blur-xl bg-white/70 border border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.04)] rounded-full px-2 py-2 pl-6 flex items-center justify-between transition-all duration-500 hover:bg-white/80 hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)]">
            <a href="#" className="flex items-center gap-2">
              <span className="font-medium text-slate-800 tracking-tight text-sm uppercase hidden sm:block">
                OpenRecord
              </span>
            </a>

            <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
              <a href="#features" className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 uppercase tracking-wider rounded-full hover:bg-white/60 transition-all">
                Features
              </a>
              <a href="#setup" className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 uppercase tracking-wider rounded-full hover:bg-white/60 transition-all">
                Setup
              </a>
            </nav>

            <div className="flex items-center gap-2">
              <a
                href="https://github.com/Fan-Pier-Labs/openrecord"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-2 justify-center px-6 py-2.5 text-xs font-medium text-slate-700 uppercase tracking-widest bg-white/60 border border-slate-200/60 rounded-full hover:bg-white transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
              >
                <Icon icon="mdi:github" width={16} height={16} />
                GitHub
              </a>
              <button
                onClick={() => { setShowModal(true); setModalStep("signin"); }}
                className="hidden sm:inline-flex items-center justify-center px-6 py-2.5 text-xs font-medium text-white uppercase tracking-widest bg-slate-900 rounded-full hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-slate-900/20 hover:-translate-y-0.5"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full min-h-screen flex items-center justify-center" style={{ padding: "6rem 5% 4rem" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-16 max-w-[1300px] w-full z-10">
          <div className="flex flex-col items-start md:items-start text-left">
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/80 border border-blue-100/80 text-[11px] font-medium tracking-wide text-blue-600 shadow-sm backdrop-blur-md">
                <Icon icon="solar:lock-keyhole-minimalistic-linear" width={14} height={14} />
                Open-source
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50/80 border border-slate-200/80 text-[11px] font-medium tracking-wide text-slate-600 shadow-sm backdrop-blur-md">
                <Icon icon="solar:rocket-linear" width={14} height={14} />
                2 minute setup on Railway
              </span>
            </div>

            <h1 className="tracking-tight whitespace-nowrap leading-[1.05] mb-6" style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", fontWeight: 600, letterSpacing: "-0.04em", color: "#1a1a24" }}>
              Claude
              <Icon icon="lucide:arrow-right-left" className="inline-block align-middle text-slate-300 mx-1" width="0.8em" height="0.8em" />
              MyChart.
            </h1>
            <p className="mb-10 font-light leading-relaxed max-w-[540px]" style={{ fontSize: "clamp(1.1rem, 1.5vw, 1.25rem)", color: "#5a5a6a" }}>
              Manage your health data with Claude AI. Connect your MyChart portal
              to Claude (or other AI assistants). Manage your health records, send
              messages, book appointments, request refills, and more—all with AI.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 items-start">
              <button
                onClick={() => setShowModal(true)}
                className="group inline-flex items-center justify-center px-10 py-4 text-base font-medium text-white bg-slate-900 border border-slate-800 rounded-full cursor-pointer hover:bg-slate-800 hover:-translate-y-1 transition-all duration-300 shadow-[0_15px_35px_rgba(0,0,0,0.04),inset_0_0_0_1px_rgba(255,255,255,0.5)] hover:shadow-[0_25px_45px_rgba(0,0,0,0.08)]"
              >
                Get started
                <Icon icon="lucide:arrow-right" width={18} height={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="https://github.com/Fan-Pier-Labs/openrecord"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-full text-sm font-medium text-slate-700 bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] hover:bg-white/60 hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition-all duration-300 flex items-center gap-2"
              >
                <Icon icon="mdi:github" width={18} height={18} />
                GitHub
              </a>
            </div>
          </div>

          <div className="flex relative items-center justify-center" style={{ perspective: "1400px" }}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[125%] h-[125%] bg-emerald-400/10 rounded-full blur-[90px] -z-10 pointer-events-none" />
            <PhoneMockup />
          </div>
        </div>
      </section>

      <main className="z-10 w-full relative">
        {/* Data Types Marquee */}
        <section className="flex flex-col w-full max-w-[1400px] border-slate-200/30 border-t mx-auto pt-16 pb-16 items-center justify-center overflow-hidden">
          <div
            className="w-full relative flex items-center overflow-hidden py-2"
            style={{
              maskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
              WebkitMaskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
            }}
          >
            <div className="marquee-track flex w-max hover:[animation-play-state:paused]" style={{ animationDuration: "40s" }}>
              {[...DATA_CATEGORIES, ...DATA_CATEGORIES].map((cat, i) => (
                <span
                  key={i}
                  className="px-5 py-2.5 bg-white/60 backdrop-blur-md border border-slate-200/60 rounded-full text-sm font-medium text-slate-600 shadow-sm whitespace-nowrap mr-4"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section id="features" className="max-w-[1400px] mx-auto pt-20 px-6 pb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-medium text-slate-900 tracking-tight mb-4">
              Everything your health portal can do, now with AI
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto font-light">
              We reverse-engineer the full MyChart web interface — not just the
              limited FHIR API — so your AI assistant gets the complete picture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className={`glass-panel flex flex-col group rounded-[2rem] p-8 justify-between transition-all duration-1000 ${feature.span || ""}`}
              >
                <div>
                  <div className="flex bg-slate-100 w-12 h-12 border-slate-200 border rounded-full shadow-inner items-center justify-center mb-6">
                    <Icon icon={feature.icon} width={24} height={24} className="text-slate-700" />
                  </div>
                  <h3 className="text-2xl font-medium text-slate-900 mb-3 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className={`text-slate-500 font-light ${feature.span ? "text-lg" : "text-sm"}`}>
                    {feature.description}
                  </p>
                </div>
                {feature.visual}
              </div>
            ))}
          </div>
        </section>

        {/* How It Works Timeline */}
        <section
          id="setup"
          ref={timelineSectionRef}
          className="md:py-48 overflow-hidden bg-slate-50/30 pt-32 pb-32 relative border-y border-slate-200/40"
        >
          <div className="max-w-6xl mx-auto px-6 relative z-20 text-center mb-16 md:mb-24 tl-title">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 border border-slate-200/70 backdrop-blur-md text-[11px] font-medium tracking-widest uppercase text-slate-500 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Quick Start
            </div>
            <h2 className="mt-6 text-4xl md:text-5xl font-medium text-slate-900 tracking-tight leading-[0.95]">
              Up and running in 3 steps
            </h2>
            <p className="mt-4 text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-light">
              Connect your MyChart account and start exploring your health data with Claude in minutes.
            </p>
          </div>

          {/* Spine */}
          <div
            className="tl-spine absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 overflow-hidden hidden md:block"
            style={{
              background: "rgba(226, 232, 240, 0.35)",
              maskImage: "linear-gradient(180deg, transparent, black 30%, black 100%, transparent)",
              WebkitMaskImage: "linear-gradient(180deg, transparent, black 30%, black 100%, transparent)",
            }}
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white rounded-full blur-[100px] opacity-40 pointer-events-none" />

          <div className="max-w-6xl mx-auto px-6 relative z-10 flex flex-col gap-24 md:gap-40">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className="tl-step group relative grid grid-cols-1 md:grid-cols-2 gap-8 items-start"
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                {/* Node */}
                <div className="absolute left-1/2 top-[3.5rem] -translate-x-1/2 hidden md:flex items-center justify-center z-20">
                  <div className="tl-halo absolute w-24 h-24 border border-slate-100/50 rounded-full pointer-events-none" />
                  <div
                    className="tl-node w-14 h-14 bg-white rounded-full border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.04),inset_0_2px_4px_rgba(255,255,255,0.9)] flex items-center justify-center animate-[breathe_6s_ease-in-out_infinite] group-hover:scale-105 transition-transform duration-500"
                    style={{ animationDelay: `${i * 1.5}s` }}
                  >
                    <Icon icon={step.icon} width={24} height={24} className="text-slate-400" />
                  </div>
                </div>

                {/* Alternating left/right */}
                {i % 2 === 0 ? (
                  <>
                    <div className="md:text-right md:pr-24 mt-8 md:mt-0">
                      <div className="relative bg-white rounded-2xl p-8 md:p-10 shadow-[0_2px_8px_rgba(0,0,0,0.03),0_12px_24px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,1)] border border-slate-100/80 transition-transform duration-500 group-hover:-translate-y-2 hover:shadow-[0_8px_20px_rgba(0,0,0,0.05),0_20px_40px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,1)]">
                        <div className="md:hidden absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-white rounded-full border border-slate-100 shadow-sm flex items-center justify-center">
                          <span className="font-semibold text-slate-400">{i + 1}</span>
                        </div>
                        <div className="text-[10px] font-medium tracking-[0.25em] text-slate-400 uppercase mb-4">
                          Step {i + 1}
                        </div>
                        <h3 className="text-3xl font-medium text-slate-800 mb-4 tracking-tight">
                          {step.title}
                        </h3>
                        <p className="text-slate-500 leading-relaxed text-lg font-light">
                          {step.description}
                        </p>
                      </div>
                    </div>
                    <div className="hidden md:block" />
                  </>
                ) : (
                  <>
                    <div className="hidden md:block" />
                    <div className="md:text-left md:pl-24 mt-8 md:mt-0">
                      <div className="relative bg-white rounded-2xl p-8 md:p-10 shadow-[0_2px_8px_rgba(0,0,0,0.03),0_12px_24px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,1)] border border-slate-100/80 transition-transform duration-500 group-hover:-translate-y-2 hover:shadow-[0_8px_20px_rgba(0,0,0,0.05),0_20px_40px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,1)]">
                        <div className="md:hidden absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-white rounded-full border border-slate-100 shadow-sm flex items-center justify-center">
                          <span className="font-semibold text-slate-400">{i + 1}</span>
                        </div>
                        <div className="text-[10px] font-medium tracking-[0.25em] text-slate-400 uppercase mb-4">
                          Step {i + 1}
                        </div>
                        <h3 className="text-3xl font-medium text-slate-800 mb-4 tracking-tight">
                          {step.title}
                        </h3>
                        <p className="text-slate-500 leading-relaxed text-lg font-light">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 md:py-32 relative flex flex-col items-center justify-center text-center px-6 z-20">
          <h2 className="text-4xl md:text-5xl font-medium text-slate-900 tracking-tight mb-6">
            Ready to explore your health data?
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 font-light">
            Get up and running in minutes. Connect your MyChart portal and start using Claude to manage your health records.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="group inline-flex items-center justify-center px-10 py-4 text-base font-medium text-white bg-slate-900 border border-slate-800 rounded-full cursor-pointer hover:bg-slate-800 hover:-translate-y-1 transition-all duration-300 shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-slate-900/20"
          >
            Get started
            <Icon icon="lucide:arrow-right" width={18} height={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
        </section>

        {/* Footer */}
        <footer className="bg-white/80 backdrop-blur-md border-t border-slate-200 pt-16 pb-8 relative z-10">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <span className="text-lg font-medium text-slate-900 tracking-tight uppercase">
                OpenRecord
              </span>
              <p className="text-sm text-slate-500 font-light text-center md:text-left">
                Open-source health data access for AI assistants.
              </p>
              <div className="flex gap-6 items-center">
                <a
                  href="https://github.com/Fan-Pier-Labs/openrecord"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-slate-900 transition-colors"
                  aria-label="GitHub"
                >
                  <Icon icon="mdi:github" width={22} height={22} />
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>

      {/* Get Started Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setModalStep("choose"); } }}
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                {modalStep === "signin" && (
                  <button
                    onClick={() => setModalStep("choose")}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Icon icon="lucide:arrow-left" width={20} height={20} />
                  </button>
                )}
                <h3 className="text-xl font-semibold text-slate-800 tracking-tight">
                  {modalStep === "choose" ? "Choose your setup" : (authMode === "signin" ? "Sign in" : "Create an account")}
                </h3>
              </div>
              <button
                onClick={() => { setShowModal(false); setModalStep("choose"); }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Icon icon="lucide:x" width={24} height={24} />
              </button>
            </div>

            {modalStep === "choose" ? (
              <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
                {/* Self-host option */}
                <a
                  href="https://railway.com/deploy/5F69Mf?referralCode=xrxOUg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex flex-col p-6 rounded-2xl border-2 border-slate-200 hover:border-slate-900 hover:shadow-lg transition-all bg-white text-left"
                >
                  <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon icon="lucide:server" width={24} height={24} />
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">Host it yourself</h4>
                  <p className="text-sm text-slate-500 mb-6 flex-1">
                    Deploy directly to Railway. You control the infrastructure and data flow.
                  </p>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2 text-sm text-slate-600">
                      <Icon icon="lucide:check-circle-2" width={18} height={18} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>Maximum privacy and security</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-600">
                      <Icon icon="lucide:check-circle-2" width={18} height={18} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>Completely free to use</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-600">
                      <Icon icon="lucide:alert-triangle" width={18} height={18} className="text-amber-500 shrink-0 mt-0.5" />
                      <span className="whitespace-nowrap">Requires Railway setup</span>
                    </li>
                  </ul>
                  <div className="w-full py-2.5 px-4 bg-slate-50 text-slate-700 text-sm font-medium rounded-xl border border-slate-200 text-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    Deploy to Railway
                  </div>
                </a>

                {/* Express option */}
                <button
                  onClick={() => setModalStep("signin")}
                  className="group relative flex flex-col p-6 rounded-2xl border-2 border-blue-100 hover:border-blue-500 hover:shadow-lg transition-all bg-gradient-to-b from-blue-50/50 to-white text-left"
                >
                  <div className="absolute -top-3 -right-3 bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider py-1 px-3 rounded-full shadow-sm">
                    Recommended
                  </div>
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon icon="lucide:zap" width={24} height={24} />
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">Express setup</h4>
                  <p className="text-sm text-slate-500 mb-6 flex-1">
                    Use our hosted service. Connect your portal and start in seconds.
                  </p>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2 text-sm text-slate-600">
                      <Icon icon="lucide:check-circle-2" width={18} height={18} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>Instant access in &lt; 2 mins</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-600">
                      <Icon icon="lucide:check-circle-2" width={18} height={18} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>Completely free to use</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-600">
                      <Icon icon="lucide:alert-triangle" width={18} height={18} className="text-amber-500 shrink-0 mt-0.5" />
                      <span>Data passes through our proxy</span>
                    </li>
                  </ul>
                  <div className="w-full py-2.5 px-4 bg-blue-50 text-blue-700 text-sm font-medium rounded-xl border border-blue-200 text-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    Continue with Express
                  </div>
                </button>
              </div>
            ) : (
              <div className="p-6 md:p-8 bg-white">
                <div className="max-w-sm mx-auto">
                  <p className="text-sm text-slate-500 text-center mb-6">
                    {authMode === "signin"
                      ? "Sign in to manage your MyChart connections."
                      : "Create an account to get started."}
                  </p>
                  <div className="space-y-4">
                    {googleOAuthEnabled && (
                      <>
                        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
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

                    {authMode === "signup" && (
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
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
                        <Button className="w-full bg-blue-600 hover:bg-blue-500" onClick={handleEmailSignIn}>
                          Sign In
                        </Button>
                        <button
                          className="w-full text-sm text-blue-600 hover:underline font-medium py-1"
                          onClick={handleMagicLink}
                        >
                          Sign in with email link instead
                        </button>
                        <p className="text-center text-sm text-slate-500">
                          Don&apos;t have an account?{" "}
                          <button className="text-blue-600 hover:underline font-medium" onClick={() => setAuthMode("signup")}>
                            Sign up
                          </button>
                        </p>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200" />
                          </div>
                          <div className="relative flex justify-center text-xs">
                            <span className="bg-white px-2 text-slate-400">or</span>
                          </div>
                        </div>
                        {!showMagicLinkInput ? (
                          <Button variant="outline" className="w-full" onClick={() => setShowMagicLinkInput(true)}>
                            <Icon icon="solar:letter-linear" width={20} height={20} className="mr-2" />
                            Sign in with Email Link
                          </Button>
                        ) : (
                          <div className="space-y-2">
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              value={magicLinkEmail}
                              onChange={(e) => setMagicLinkEmail(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
                              autoFocus
                            />
                            <Button className="w-full bg-blue-600 hover:bg-blue-500" onClick={handleMagicLink}>
                              Send Sign-in Link
                            </Button>
                          </div>
                        )}
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200" />
                          </div>
                          <div className="relative flex justify-center text-xs">
                            <span className="bg-white px-2 text-slate-400">or</span>
                          </div>
                        </div>
                        <Button variant="outline" className="w-full" onClick={handlePasskeySignIn}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a7.464 7.464 0 0 1-1.15 3.993m1.989 3.559A11.209 11.209 0 0 0 8.25 10.5a3.75 3.75 0 1 1 7.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 0 1-3.6 9.75m6.633-4.596a18.666 18.666 0 0 1-2.485 5.33" />
                          </svg>
                          Sign in with Passkey
                        </Button>
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
                            <li>This software is provided as-is with no warranty. Use at your own risk</li>
                            <li>By using this service, you agree to MyChart&apos;s Terms of Use</li>
                            <li>We are not associated with, endorsed by, or affiliated with Epic Systems or MyChart</li>
                          </ul>
                        </div>
                        <Button className="w-full bg-blue-600 hover:bg-blue-500" onClick={handleEmailSignUp} disabled={!tosAccepted}>
                          Create Account
                        </Button>
                        <p className="text-center text-sm text-slate-500">
                          Already have an account?{" "}
                          <button className="text-blue-600 hover:underline font-medium" onClick={() => setAuthMode("signin")}>
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
                    <Button variant="outline" className="w-full" onClick={loadDemo}>
                      View Demo with Sample Data
                    </Button>
                  </div>
                  <p className="mt-4 text-center text-xs text-slate-400">
                    Your MyChart credentials are encrypted at rest. Health data is not stored on our servers.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
