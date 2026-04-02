"use client";

import { useState, useCallback } from "react";

export function useLetters(token: string) {
  const [letterHtml, setLetterHtml] = useState<Record<string, string>>({});
  const [loadingLetters, setLoadingLetters] = useState<Record<string, boolean>>({});

  const fetchLetterContent = useCallback(async (hnoId: string, csn: string) => {
    const key = `${hnoId}-${csn}`;
    if (letterHtml[key]) return;
    setLoadingLetters(prev => ({ ...prev, [key]: true }));
    try {
      const resp = await fetch('/api/letter-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, hnoId, csn }),
      });
      const data = await resp.json();
      if (data.bodyHTML) {
        setLetterHtml(prev => ({ ...prev, [key]: data.bodyHTML }));
      }
    } catch (err) {
      console.error('Failed to fetch letter:', err);
    } finally {
      setLoadingLetters(prev => ({ ...prev, [key]: false }));
    }
  }, [token, letterHtml]);

  const downloadLetterPdf = useCallback((hnoId: string, csn: string, reason: string) => {
    const key = `${hnoId}-${csn}`;
    const html = letterHtml[key];
    if (!html) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<!DOCTYPE html><html><head><title>${reason}</title><style>@media print { body { margin: 0; } }</style></head><body>${html}</body></html>`);
      printWindow.document.close();
    }
  }, [letterHtml]);

  const toggleLetter = useCallback((key: string, hnoId: string, csn: string) => {
    if (letterHtml[key]) {
      setLetterHtml(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } else {
      fetchLetterContent(hnoId, csn);
    }
  }, [letterHtml, fetchLetterContent]);

  return { letterHtml, loadingLetters, toggleLetter, downloadLetterPdf };
}
