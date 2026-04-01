import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/app-context";
import { Toaster } from "@/components/ui/toaster";
import { AmplitudeProvider } from "@/components/AmplitudeProvider";
import { UpdateBanner } from "@/components/UpdateBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenRecord - Manage your Health Data with AI",
  description:
    "Connect your MyChart portal to Claude AI. Manage health records, send messages, book appointments, request refills, and more — all with AI.",

  openGraph: {
    title: "OpenRecord - Manage your Health Data with AI",
    description:
      "Connect your MyChart portal to Claude AI. Manage health records, send messages, book appointments, request refills, and more — all with AI.",
    siteName: "OpenRecord",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "OpenRecord — Manage your healthcare with Claude AI",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenRecord - Manage your Health Data with AI",
    description:
      "Connect your MyChart portal to Claude AI. Manage health records, send messages, book appointments, request refills, and more — all with AI.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProvider>
          <AmplitudeProvider />
          <UpdateBanner />
          {children}
          <Toaster />
        </AppProvider>
      </body>
    </html>
  );
}
