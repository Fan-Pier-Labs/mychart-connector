"use client";

import { useState, useCallback } from "react";

export function useImaging(token: string) {
  const [xrayImages, setXrayImages] = useState<Record<number, string | null>>({});
  const [xrayLoading, setXrayLoading] = useState<Record<number, boolean>>({});
  const [xrayErrors, setXrayErrors] = useState<Record<number, string | null>>({});

  const fetchXray = useCallback(async (index: number, fdiContext: { fdi: string; ord: string }) => {
    setXrayLoading(prev => ({ ...prev, [index]: true }));
    setXrayErrors(prev => ({ ...prev, [index]: null }));
    try {
      const fdiParam = btoa(JSON.stringify(fdiContext));
      const resp = await fetch(`/api/mychart-xray?token=${encodeURIComponent(token)}&fdi=${encodeURIComponent(fdiParam)}`);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Failed to load X-ray' }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      setXrayImages(prev => ({ ...prev, [index]: url }));
    } catch (err) {
      const msg = (err as Error).message;
      setXrayErrors(prev => ({ ...prev, [index]: msg.length > 200 ? msg.slice(0, 200) + '…' : msg }));
    } finally {
      setXrayLoading(prev => ({ ...prev, [index]: false }));
    }
  }, [token]);

  return { xrayImages, xrayLoading, xrayErrors, fetchXray };
}
