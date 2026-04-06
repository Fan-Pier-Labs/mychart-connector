"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { useAppContext } from "@/lib/app-context";
import { track } from "@/lib/track";

export function ScrapeCard({ onLoadingChange }: { onLoadingChange: (loading: boolean, text: string) => void }) {
  const router = useRouter();
  const ctx = useAppContext();
  const [scraping, setScraping] = useState(false);

  if (!ctx.activeSessionKey) return null;

  async function startScraping() {
    track("scrape_button_clicked");
    setScraping(true);
    onLoadingChange(true, "Scraping your MyChart data (this may take a minute)...");

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKey: ctx.activeSessionKey }),
      });
      const data = await res.json();
      ctx.setResults(data);
      setScraping(false);
      onLoadingChange(false, "");
      router.push("/scrape-results");
    } catch (err) {
      toast.error("Scraping failed: " + (err as Error).message);
      setScraping(false);
      onLoadingChange(false, "");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scrape Data</CardTitle>
        <CardDescription>
          Pull all your medical records from MyChart.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" variant="secondary" onClick={startScraping} disabled={scraping}>
          Scrape Data Now
        </Button>
      </CardContent>
    </Card>
  );
}
