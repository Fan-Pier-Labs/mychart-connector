"use client";

import { useState, useCallback } from "react";

export function useBilling(token: string) {
  const [loadingStatements, setLoadingStatements] = useState<Record<string, boolean>>({});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchStatementPdf = useCallback(async (encBillingId: string, statement: any, action: 'view' | 'download') => {
    const key = `${statement.RecordID}-${statement.DateDisplay}`;
    setLoadingStatements(prev => ({ ...prev, [key]: true }));
    try {
      const resp = await fetch('/api/billing-statement-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, encBillingId, statement }),
      });
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      if (action === 'view') {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `Statement_${statement.FormattedDateDisplay || statement.DateDisplay}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to fetch statement PDF:', err);
    } finally {
      setLoadingStatements(prev => ({ ...prev, [key]: false }));
    }
  }, [token]);

  return { loadingStatements, fetchStatementPdf };
}
