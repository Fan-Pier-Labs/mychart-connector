"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArraySection } from "@/components/data-display";
import { withRenderErrorBoundary } from "@/components/with-render-error-boundary";
import type { ImagingResultType } from "@/types/scrape-results";

const SafeArraySection = withRenderErrorBoundary(ArraySection, "ArraySection", (p) => p.data);

type ImageRef = { seriesUID: string; objectUID: string };
type SeriesInfo = { seriesUID: string; description: string; imageCount: number; images: ImageRef[] };

interface ImagingSectionProps {
  imagingResults: ImagingResultType[] | undefined;
  isDemo: boolean;
  token: string;
}

function ImageViewer({ token, fdiParam, images, description }: {
  token: string;
  fdiParam: string;
  images: ImageRef[];
  description: string;
}) {
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [blobUrls, setBlobUrls] = useState<Record<number, string>>({});

  const total = images.length;

  const loadImage = useCallback(async (idx: number) => {
    setLoading(true);
    setError(null);
    const img = images[idx];
    const url = `/api/mychart-xray?token=${encodeURIComponent(token)}&fdi=${encodeURIComponent(fdiParam)}&seriesUID=${encodeURIComponent(img.seriesUID)}&objectUID=${encodeURIComponent(img.objectUID)}`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({ error: 'Failed to load' }));
        throw new Error(body.error || `HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      setBlobUrls(prev => ({ ...prev, [idx]: blobUrl }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, fdiParam, images]);

  useEffect(() => {
    if (blobUrls[index]) {
      setLoading(false);
      setError(null);
      return;
    }
    loadImage(index);
  }, [index, blobUrls, loadImage]);

  const downloadZip = async () => {
    setDownloading(true);
    try {
      const imagesJson = encodeURIComponent(JSON.stringify(images));
      const desc = encodeURIComponent(description);
      const resp = await fetch(
        `/api/mychart-xray-zip?token=${encodeURIComponent(token)}&fdi=${encodeURIComponent(fdiParam)}&images=${imagesJson}&description=${desc}`
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = resp.headers.get('Content-Disposition');
      const filenameMatch = cd?.match(/filename="?([^"]+)"?/);
      a.download = filenameMatch?.[1] ?? `${description}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Download failed: ${(err as Error).message}`);
    } finally {
      setDownloading(false);
    }
  };

  const currentUrl = blobUrls[index];

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-xs font-medium">{description}</p>
        {total > 1 && (
          <span className="text-xs text-muted-foreground">
            {index + 1} / {total}
          </span>
        )}
        {total > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-6 ml-auto"
            disabled={downloading}
            onClick={downloadZip}
          >
            {downloading ? 'Downloading...' : `Download All (${total})`}
          </Button>
        )}
      </div>
      <div className="relative inline-block">
        {loading && (
          <div className="flex items-center justify-center bg-black/80 rounded-md border min-h-[200px] min-w-[200px] p-8">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              <span className="text-xs text-muted-foreground">Loading image...</span>
            </div>
          </div>
        )}
        {!loading && error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
        {!loading && currentUrl && (
          <img
            src={currentUrl}
            alt={`${description} (${index + 1}/${total})`}
            className="rounded-md border bg-black"
            style={{ maxHeight: 512 }}
          />
        )}
        {total > 1 && !loading && currentUrl && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              className="h-7 px-2 text-xs opacity-90"
              disabled={index === 0}
              onClick={() => setIndex(i => i - 1)}
            >
              Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 px-2 text-xs opacity-90"
              disabled={index >= total - 1}
              onClick={() => setIndex(i => i + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ImagingSection({ imagingResults, isDemo, token }: ImagingSectionProps) {
  const [seriesData, setSeriesData] = useState<Record<number, SeriesInfo[]>>({});
  const [seriesLoading, setSeriesLoading] = useState<Record<number, boolean>>({});
  const [seriesErrors, setSeriesErrors] = useState<Record<number, string | null>>({});
  const [openViewers, setOpenViewers] = useState<Record<string, boolean>>({});
  const [fdiParams, setFdiParams] = useState<Record<number, string>>({});

  const fetchSeries = useCallback(async (index: number, fdiContext: { fdi: string; ord: string }) => {
    setSeriesLoading(prev => ({ ...prev, [index]: true }));
    setSeriesErrors(prev => ({ ...prev, [index]: null }));
    try {
      const fdiParam = btoa(JSON.stringify(fdiContext));
      setFdiParams(prev => ({ ...prev, [index]: fdiParam }));
      const resp = await fetch(`/api/mychart-series?token=${encodeURIComponent(token)}&fdi=${encodeURIComponent(fdiParam)}`);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Failed to load series' }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setSeriesData(prev => ({ ...prev, [index]: data.series }));
    } catch (err) {
      const msg = (err as Error).message;
      setSeriesErrors(prev => ({ ...prev, [index]: msg.length > 200 ? msg.slice(0, 200) + '...' : msg }));
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
                <div className="space-y-3">
                  <span className="text-xs font-medium">Series:</span>
                  <div className="flex flex-wrap gap-2">
                    {seriesData[i].map((s, j) => {
                      const key = `${i}-${j}`;
                      const isOpen = !!openViewers[key];
                      return (
                        <Button
                          key={j}
                          variant={isOpen ? "secondary" : "outline"}
                          size="sm"
                          className="text-xs h-7"
                          disabled={s.imageCount === 0}
                          onClick={() => s.imageCount > 0 && setOpenViewers(prev => ({ ...prev, [key]: !prev[key] }))}
                        >
                          {s.description} ({s.imageCount} images)
                        </Button>
                      );
                    })}
                  </div>
                  {seriesData[i].map((s, j) => {
                    const key = `${i}-${j}`;
                    if (!openViewers[key] || s.imageCount === 0) return null;
                    return (
                      <ImageViewer
                        key={`viewer-${key}`}
                        token={token}
                        fdiParam={fdiParams[i]}
                        images={s.images}
                        description={s.description}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </SafeArraySection>
  );
}
