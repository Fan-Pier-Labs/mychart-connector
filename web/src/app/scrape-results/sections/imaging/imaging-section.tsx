"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArraySection } from "@/components/data-display";
import { withRenderErrorBoundary } from "@/components/with-render-error-boundary";
import type { ImagingResultType } from "@/types/scrape-results";

const SafeArraySection = withRenderErrorBoundary(ArraySection, "ArraySection", (p) => p.data);

type ImageRef = { seriesUID: string; objectUID: string };

interface ImagingSectionProps {
  imagingResults: ImagingResultType[] | undefined;
  isDemo: boolean;
  token: string;
}

/** Number of images to load immediately when opening the viewer */
const INITIAL_LOAD = 10;
/** Number of images to prefetch ahead of the current index */
const PREFETCH_AHEAD = 5;

function StudyViewer({ token, fdiParam, images, studyName }: {
  token: string;
  fdiParam: string;
  images: ImageRef[];
  studyName: string;
}) {
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [blobUrls, setBlobUrls] = useState<Record<number, string>>({});
  const loadingRef = useRef<Set<number>>(new Set());

  const total = images.length;

  const loadImage = useCallback(async (idx: number): Promise<string | null> => {
    if (loadingRef.current.has(idx)) return null;
    loadingRef.current.add(idx);
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
      return blobUrl;
    } catch (err) {
      loadingRef.current.delete(idx);
      throw err;
    }
  }, [token, fdiParam, images]);

  // Load initial batch on mount
  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load first image, then prefetch remaining initial batch
        await loadImage(0);
        const batch = Math.min(INITIAL_LOAD, total);
        for (let i = 1; i < batch; i++) {
          loadImage(i).catch(() => {}); // fire-and-forget
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load current image if not cached, and prefetch ahead
  useEffect(() => {
    if (blobUrls[index]) {
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
      loadImage(index)
        .then(() => setLoading(false))
        .catch(err => { setError((err as Error).message); setLoading(false); });
    }
    // Prefetch ahead
    for (let i = index + 1; i <= Math.min(index + PREFETCH_AHEAD, total - 1); i++) {
      if (!blobUrls[i]) {
        loadImage(i).catch(() => {});
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const downloadZip = async () => {
    setDownloading(true);
    try {
      const imagesJson = encodeURIComponent(JSON.stringify(images));
      const desc = encodeURIComponent(studyName);
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
      a.download = filenameMatch?.[1] ?? `${studyName}.zip`;
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
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted-foreground">
          {index + 1} / {total} images
        </span>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-6 ml-auto"
          disabled={downloading}
          onClick={downloadZip}
        >
          {downloading ? 'Downloading...' : `Download All (${total})`}
        </Button>
      </div>
      <div className="relative inline-block">
        {loading && (
          <div className="flex items-center justify-center bg-black/80 rounded-md border min-h-[200px] min-w-[200px] p-8">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              <span className="text-xs text-muted-foreground">Loading image {index + 1}...</span>
            </div>
          </div>
        )}
        {!loading && error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
        {!loading && currentUrl && (
          <img
            src={currentUrl}
            alt={`${studyName} (${index + 1}/${total})`}
            className="rounded-md border bg-black"
            style={{ maxHeight: 512 }}
          />
        )}
        {total > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              className="h-7 px-2 text-xs opacity-90"
              disabled={index === 0}
              onClick={() => setIndex(i => i - 1)}
            >
              &larr; Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 px-2 text-xs opacity-90"
              disabled={index >= total - 1}
              onClick={() => setIndex(i => i + 1)}
            >
              Next &rarr;
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ImagingSection({ imagingResults, isDemo, token }: ImagingSectionProps) {
  const [studyImages, setStudyImages] = useState<Record<number, ImageRef[]>>({});
  const [studyLoading, setStudyLoading] = useState<Record<number, boolean>>({});
  const [studyErrors, setStudyErrors] = useState<Record<number, string | null>>({});
  const [viewerOpen, setViewerOpen] = useState<Record<number, boolean>>({});
  const [fdiParams, setFdiParams] = useState<Record<number, string>>({});

  const loadStudy = useCallback(async (index: number, fdiContext: { fdi: string; ord: string }) => {
    setStudyLoading(prev => ({ ...prev, [index]: true }));
    setStudyErrors(prev => ({ ...prev, [index]: null }));
    try {
      const fdiParam = btoa(JSON.stringify(fdiContext));
      setFdiParams(prev => ({ ...prev, [index]: fdiParam }));
      const resp = await fetch(`/api/mychart-series?token=${encodeURIComponent(token)}&fdi=${encodeURIComponent(fdiParam)}`);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Failed to load images' }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      // Flatten all series into one image list
      const allImages: ImageRef[] = [];
      for (const s of data.series) {
        for (const img of s.images) {
          allImages.push(img);
        }
      }
      setStudyImages(prev => ({ ...prev, [index]: allImages }));
      setViewerOpen(prev => ({ ...prev, [index]: true }));
    } catch (err) {
      const msg = (err as Error).message;
      setStudyErrors(prev => ({ ...prev, [index]: msg.length > 200 ? msg.slice(0, 200) + '...' : msg }));
    } finally {
      setStudyLoading(prev => ({ ...prev, [index]: false }));
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
          </div>
          {img.impression && (
            <div className="mt-2">
              <span className="text-xs font-medium">Impression:</span>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{img.impression}</p>
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
              {!studyImages[i] && !studyLoading[i] && !studyErrors[i] && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => loadStudy(i, img.fdiContext!)}
                >
                  View Images
                </Button>
              )}
              {studyLoading[i] && (
                <p className="text-xs text-muted-foreground">Loading images...</p>
              )}
              {studyErrors[i] && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-red-500">Failed to load images: {studyErrors[i]}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-6"
                    onClick={() => loadStudy(i, img.fdiContext!)}
                  >
                    Retry
                  </Button>
                </div>
              )}
              {studyImages[i] && studyImages[i].length > 0 && (
                <div>
                  <Button
                    variant={viewerOpen[i] ? "secondary" : "outline"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setViewerOpen(prev => ({ ...prev, [i]: !prev[i] }))}
                  >
                    {viewerOpen[i] ? "Hide Images" : "Show Images"} ({studyImages[i].length})
                  </Button>
                  {viewerOpen[i] && (
                    <StudyViewer
                      token={token}
                      fdiParam={fdiParams[i]}
                      images={studyImages[i]}
                      studyName={img.orderName}
                    />
                  )}
                </div>
              )}
              {studyImages[i] && studyImages[i].length === 0 && (
                <p className="text-xs text-muted-foreground">No downloadable images found for this study.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </SafeArraySection>
  );
}
