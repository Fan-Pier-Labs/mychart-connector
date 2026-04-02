"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArraySection } from "@/components/data-display";
import { SafeHtml } from "@/components/SafeHtml";
import { withRenderErrorBoundary } from "@/components/with-render-error-boundary";
import type { LetterType } from "@/types/scrape-results";
import { useLetters } from "./use-letters";

const SafeArraySection = withRenderErrorBoundary(ArraySection, "ArraySection", (p) => p.data);

interface LettersSectionProps {
  letters: LetterType[] | undefined;
  isDemo: boolean;
  token: string;
}

export function LettersSection({ letters, isDemo, token }: LettersSectionProps) {
  const { letterHtml, loadingLetters, toggleLetter, downloadLetterPdf } = useLetters(token);

  return (
    <SafeArraySection title="Letters" data={letters}>
      {Array.isArray(letters) && letters.map((l: LetterType, i: number) => {
        const key = `${l.hnoId}-${l.csn}`;
        const hasContent = !!letterHtml[key];
        const isLoading = loadingLetters[key];
        return (
          <div key={i} className="bg-muted rounded-md p-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{l.reason}</span>
                <p className="text-xs text-muted-foreground">{l.providerName} - {l.dateISO}</p>
              </div>
              <div className="flex items-center gap-2">
                {!l.viewed && <Badge variant="default" className="text-[10px]">New</Badge>}
                {!isDemo && l.hnoId && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      disabled={isLoading}
                      onClick={() => toggleLetter(key, l.hnoId, l.csn)}
                    >
                      {isLoading ? 'Loading...' : hasContent ? 'Hide' : 'View Letter'}
                    </Button>
                    {hasContent && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => downloadLetterPdf(l.hnoId, l.csn, l.reason)}
                      >
                        Open PDF
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
            {hasContent && (
              <SafeHtml
                html={letterHtml[key]}
                token={token}
                className="mt-3 border rounded bg-white p-4 text-xs overflow-auto max-h-96"
              />
            )}
          </div>
        );
      })}
    </SafeArraySection>
  );
}
