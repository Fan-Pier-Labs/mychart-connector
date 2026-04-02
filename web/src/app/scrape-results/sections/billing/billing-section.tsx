"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BillingVisits } from "@/components/data-display";
import { ErrorBoundary, withRenderErrorBoundary } from "@/components/with-render-error-boundary";
import type { BillingAccount } from "../../../../../../scrapers/myChart/bills/bills";
import type { StatementItem } from "../../../../../../scrapers/myChart/bills/types";
import { useBilling } from "./use-billing";

const SafeBillingVisits = withRenderErrorBoundary(BillingVisits, "BillingVisits", (p) => p.visits);

interface BillingSectionProps {
  billing: BillingAccount[] | undefined;
  isDemo: boolean;
  token: string;
}

export function BillingSection({ billing, isDemo, token }: BillingSectionProps) {
  // Must call hooks before any early returns (Rules of Hooks)
  const { loadingStatements, fetchStatementPdf } = useBilling(token);

  if (!billing || !Array.isArray(billing) || billing.length === 0) return null;

  return (
    <ErrorBoundary name="Billing" data={billing}>
    <Card>
      <CardHeader>
        <CardTitle>Billing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {billing.map((account: BillingAccount, i: number) => {
          const allStatements = [
            ...(account.statementList?.DataStatement?.StatementList || []),
            ...(account.statementList?.DataDetailBill?.StatementList || []),
          ];
          return (
            <div key={i}>
              <h3 className="font-semibold">
                Guarantor #{account.guarantorNumber} ({account.patientName})
              </h3>
              {account.amountDue !== undefined && (
                <p className="text-sm text-muted-foreground">
                  Amount Due: ${account.amountDue?.toFixed(2)}
                </p>
              )}

              {/* Billing Statements / PDFs */}
              {allStatements.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-semibold mb-2">Statements & Bills ({allStatements.length})</h4>
                  <div className="space-y-2">
                    {allStatements.map((stmt: StatementItem, j: number) => {
                      const stmtKey = `${stmt.RecordID}-${stmt.DateDisplay}`;
                      const stmtLoading = loadingStatements[stmtKey];
                      return (
                        <div key={j} className="flex items-center justify-between bg-muted rounded-md p-3 text-sm">
                          <div>
                            <span className="font-medium">{stmt.Description || 'Statement'}</span>
                            <p className="text-xs text-muted-foreground">
                              {stmt.FormattedDateDisplay || stmt.DateDisplay}
                              {stmt.StatementAmountDisplay && ` - ${stmt.StatementAmountDisplay}`}
                            </p>
                          </div>
                          {!isDemo && account.encBillingId && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                disabled={stmtLoading}
                                onClick={() => fetchStatementPdf(account.encBillingId!, stmt, 'view')}
                              >
                                {stmtLoading ? 'Loading...' : 'View PDF'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                disabled={stmtLoading}
                                onClick={() => fetchStatementPdf(account.encBillingId!, stmt, 'download')}
                              >
                                Download PDF
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {account.billingDetails?.Data && (
                <SafeBillingVisits
                  visits={[
                    ...(account.billingDetails.Data.UnifiedVisitList || []),
                    ...(account.billingDetails.Data.InformationalVisitList || []),
                  ]}
                />
              )}
              {i < billing.length - 1 && <Separator className="mt-4" />}
            </div>
          );
        })}
      </CardContent>
    </Card>
    </ErrorBoundary>
  );
}
