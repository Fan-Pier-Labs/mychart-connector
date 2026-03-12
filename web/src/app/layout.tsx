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
  title: "MyChart MCP - AI-Powered Health Data Access",
  description: "Connect any MyChart portal to AI assistants via MCP. Access 30+ health data categories, send messages, and analyze your health data with AI.",
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
