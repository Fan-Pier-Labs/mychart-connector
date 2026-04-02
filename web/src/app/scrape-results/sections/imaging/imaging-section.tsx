"use client";

import { Button } from "@/components/ui/button";
import { ArraySection } from "@/components/data-display";
import { withRenderErrorBoundary } from "@/components/with-render-error-boundary";
import type { ImagingResultType } from "@/types/scrape-results";

const SafeArraySection = withRenderErrorBoundary(ArraySection, "ArraySection", (p) => p.data);

interface ImagingSectionProps {
  imagingResults: ImagingResultType[] | undefined;
  isDemo: boolean;
  token: string;
}

export function ImagingSection({ imagingResults, isDemo }: ImagingSectionProps) {

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
              <Button variant="outline" size="sm" className="text-xs h-7" disabled>
                View Images (coming soon)
              </Button>
            </div>
          )}
        </div>
      ))}
    </SafeArraySection>
  );
}
