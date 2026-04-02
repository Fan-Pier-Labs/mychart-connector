"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArraySection } from "@/components/data-display";
import { withRenderErrorBoundary } from "@/components/with-render-error-boundary";
import type { ImagingResultType } from "@/types/scrape-results";

const SafeArraySection = withRenderErrorBoundary(ArraySection, "ArraySection", (p) => p.data);

type SeriesInfo = { seriesUID: string; description: string; instanceCount: number };

interface ImagingSectionProps {
  imagingResults: ImagingResultType[] | undefined;
  isDemo: boolean;
  token: string;
}

export function ImagingSection({ imagingResults, isDemo, token }: ImagingSectionProps) {
  const [seriesData, setSeriesData] = useState<Record<number, SeriesInfo[]>>({});
  const [seriesLoading, setSeriesLoading] = useState<Record<number, boolean>>({});
  const [seriesErrors, setSeriesErrors] = useState<Record<number, string | null>>({});

  const fetchSeries = useCallback(async (index: number, fdiContext: { fdi: string; ord: string }) => {
    setSeriesLoading(prev => ({ ...prev, [index]: true }));
    setSeriesErrors(prev => ({ ...prev, [index]: null }));
    try {
      const fdiParam = btoa(JSON.stringify(fdiContext));
      const resp = await fetch(`/api/mychart-series?token=${encodeURIComponent(token)}&fdi=${encodeURIComponent(fdiParam)}`);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Failed to load series' }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setSeriesData(prev => ({ ...prev, [index]: data.series }));
    } catch (err) {
      const msg = (err as Error).message;
      setSeriesErrors(prev => ({ ...prev, [index]: msg.length > 200 ? msg.slice(0, 200) + '…' : msg }));
    } finally {
      setSeriesLoading(prev => ({ ...prev, [index]: false }));
    }
  }, [token]);

  return (
    <SafeArraySection title="Imaging Results" data={imagingResults}>
      {Array.isArray(imagingResults) && imagingResults.map((img: ImagingResultType, i: number) => (
        <div key={i} className="bg-muted rounded-md p-3 text-sm">
          <span className="font-semibold">{img.orderName}</span>
          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
            {img.resultDate && <span>{img.resultDate}</span>}
            {img.orderProvider && <span>Provider: {img.orderProvider}</span>}
            {img.imageStudyCount > 0 && <span>{img.imageStudyCount} studies</span>}
            {img.scanCount > 0 && <span>{img.scanCount} scans</span>}
          </div>
          {img.impression && (
            <div className="mt-2">
              <span className="text-xs font-medium">Impression:</span>
              <p className="text-xs text-muted-foreground">{img.impression}</p>
            </div>
          )}
          {img.narrative && (
            <details className="mt-1">
              <summary className="text-xs font-medium cursor-pointer">Full Report</summary>
              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{img.narrative}</p>
            </details>
          )}
          {img.fdiContext && !isDemo && (
            <div className="mt-2">
              {!seriesData[i] && !seriesLoading[i] && !seriesErrors[i] && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => fetchSeries(i, img.fdiContext!)}
                >
                  View Images
                </Button>
              )}
              {seriesLoading[i] && (
                <p className="text-xs text-muted-foreground">Loading series info...</p>
              )}
              {seriesErrors[i] && (
                <p className="text-xs text-red-500">Failed to load series: {seriesErrors[i]}</p>
              )}
              {seriesData[i] && (
                <div className="space-y-1">
                  <span className="text-xs font-medium">Series:</span>
                  <div className="flex flex-wrap gap-2">
                    {seriesData[i].map((s, j) => (
                      <Button key={j} variant="outline" size="sm" className="text-xs h-7" disabled>
                        {s.description} ({s.instanceCount} images) — coming soon
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </SafeArraySection>
  );
}
