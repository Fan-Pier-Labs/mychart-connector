"use client";

import { Button } from "@/components/ui/button";
import { ArraySection } from "@/components/data-display";
import { withRenderErrorBoundary } from "@/components/with-render-error-boundary";
import { isAdvancedImaging } from "@/lib/imaging-utils";
import type { ImagingResultType } from "@/types/scrape-results";
import { useImaging } from "./use-imaging";

const SafeArraySection = withRenderErrorBoundary(ArraySection, "ArraySection", (p) => p.data);

interface ImagingSectionProps {
  imagingResults: ImagingResultType[] | undefined;
  isDemo: boolean;
  token: string;
}

export function ImagingSection({ imagingResults, isDemo, token }: ImagingSectionProps) {
  const { xrayImages, xrayLoading, xrayErrors, fetchXray } = useImaging(token);

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
              {isAdvancedImaging(img.orderName, img.imageStudyCount + img.scanCount) ? (
                <Button variant="outline" size="sm" className="text-xs h-7" disabled>
                  View Image (coming soon)
                </Button>
              ) : (
                <>
                  {!xrayImages[i] && !xrayLoading[i] && !xrayErrors[i] && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => fetchXray(i, img.fdiContext!)}
                    >
                      View X-ray
                    </Button>
                  )}
                  {xrayLoading[i] && (
                    <p className="text-xs text-muted-foreground">Loading X-ray image...</p>
                  )}
                  {xrayErrors[i] && (
                    <p className="text-xs text-red-500">Failed to load X-ray: {xrayErrors[i]}</p>
                  )}
                  {xrayImages[i] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={xrayImages[i]!}
                      alt={img.orderName}
                      className="mt-2 max-w-full rounded border bg-black"
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </SafeArraySection>
  );
}
