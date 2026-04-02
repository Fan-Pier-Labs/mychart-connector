import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  LabTestResultWithHistory,
  LabResult,
  ResultComponent,
  ComponentResultInfo,
  ReferenceRange,
  HistoricalComponentResult,
  HistoricalResultDataPoint,
  OrderMetadata,
} from "../../../scrapers/myChart/labs_and_procedure_results/labtestresulttype";

/** Safely convert any value to a renderable string. Prevents React error #31 when
 *  a MyChart API returns an object where we expect a primitive. */
export function safeText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  const str = String(value);
  // Strip HTML tags that MyChart embeds in some fields (e.g. billing procedure descriptions)
  if (str.includes('<')) return str.replace(/<[^>]+>/g, '');
  return str;
}

export function DataRow({ label, value }: { label: string; value: unknown }) {
  if (!value) return null;
  const text = safeText(value);
  if (!text) return null;
  return (
    <>
      <span className="text-muted-foreground font-medium">{label}</span>
      <span>{text}</span>
    </>
  );
}

type DataWithError = (Record<string, unknown> & { error?: string }) | null | undefined;

export function DataSection({ title, data, count, children }: { title: string; data: DataWithError; count?: number; children: React.ReactNode }) {
  if (!data || ('error' in data && data.error)) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}{count !== undefined ? ` (${count})` : ''}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {children}
      </CardContent>
    </Card>
  );
}

export function ArraySection({ title, data, children }: { title: string; data: DataWithError | unknown[]; children: React.ReactNode }) {
  if (!data || (data && 'error' in (data as DataWithError)!) || (Array.isArray(data) && data.length === 0)) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title} ({Array.isArray(data) ? data.length : ''})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {children}
      </CardContent>
    </Card>
  );
}

type BillingVisit = {
  StartDateDisplay?: string | null;
  Description?: string | null;
  Provider?: string | null;
  ChargeAmount?: string | null;
  SelfAmountDue?: string | null;
  PrimaryPayer?: string | null;
  ProcedureList?: { Description: string; Amount: string; SelfAmountDue: string }[] | null;
};

export function BillingVisits({ visits }: { visits: BillingVisit[] }) {
  if (!visits.length) return <p className="text-sm text-muted-foreground">No billing items.</p>;
  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-muted-foreground">{visits.length} billing items</p>
      {visits.slice(0, 15).map((v, i) => (
        <div key={i} className="bg-muted rounded-md p-3 text-sm">
          <div className="font-medium">
            {safeText(v.StartDateDisplay) || "N/A"} - {safeText(v.Description) || "No description"}
          </div>
          <div className="grid grid-cols-2 gap-1 mt-1 text-xs text-muted-foreground">
            {v.Provider && <span>Provider: {safeText(v.Provider)}</span>}
            {v.ChargeAmount && <span>Charge: {safeText(v.ChargeAmount)}</span>}
            {v.SelfAmountDue && <span>You Owe: {safeText(v.SelfAmountDue)}</span>}
            {v.PrimaryPayer && <span>Insurance: {safeText(v.PrimaryPayer)}</span>}
          </div>
          {v.ProcedureList?.map((p, j) => (
            <div key={j} className="text-xs text-muted-foreground mt-1">
              - {safeText(p.Description)}: {safeText(p.Amount)} (you owe: {safeText(p.SelfAmountDue)})
            </div>
          ))}
        </div>
      ))}
      {visits.length > 15 && (
        <p className="text-xs text-muted-foreground">... and {visits.length - 15} more</p>
      )}
    </div>
  );
}

type Visit = {
  Date: string;
  Time?: string;
  VisitTypeName: string;
  PrimaryProviderName?: string;
  PrimaryDepartment?: { Name: string };
  Location?: string;
};

export function VisitsCard({ title, data, getVisits }: { title: string; data: DataWithError; getVisits: (d: NonNullable<DataWithError>) => Visit[] }) {
  if (!data || ('error' in data && data.error)) return null;
  let visits: Visit[];
  try {
    const raw = getVisits(data);
    visits = Array.isArray(raw) ? raw.filter(v => v && typeof v === 'object') : [];
  } catch {
    return null;
  }
  if (!visits.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {visits.slice(0, 15).map((v, i) => (
          <VisitItem key={i} visit={v} />
        ))}
      </CardContent>
    </Card>
  );
}

export function VisitItem({ visit }: { visit: Visit }) {
  if (!visit || typeof visit !== 'object') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = visit as any;
  const provider = safeText(v.PrimaryProviderName || v.Physician || v.Provider || '');
  const dept = safeText(v.PrimaryDepartment?.Name || v.Department || '');
  const location = safeText(v.Location || '');
  const visitType = safeText(v.VisitTypeName || v.VisitType || v.Type || '');
  return (
    <div className="bg-muted rounded-md p-3 text-sm">
      <div className="font-medium">
        {safeText(v.Date)} {safeText(v.Time)} {visitType ? `- ${visitType}` : ''}
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {provider && <span>Provider: {provider}</span>}
        {dept && <span className="ml-3">Dept: {dept}</span>}
        {location && <span className="ml-3">Location: {location}</span>}
      </div>
    </div>
  );
}

/**
 * Parse a reference range display string like "<=199", ">=41", "<0.80", ">100"
 * into a numeric value and direction.
 */
function parseRangeValue(display: string): { value: number; inclusive: boolean } | null {
  if (!display) return null;
  const match = display.match(/^([<>]=?)\s*(.+)$/);
  if (!match) return null;
  const num = parseFloat(match[2]);
  if (isNaN(num)) return null;
  return { value: num, inclusive: match[1].includes('=') };
}

function getComponentStatus(resultInfo: ComponentResultInfo | undefined): 'normal' | 'abnormal' | 'no-range' {
  if (!resultInfo) return 'no-range';

  const flag = resultInfo.abnormalFlagCategoryValue;
  if (flag && flag !== 'Unknown' && flag !== 0 && flag !== '0') return 'abnormal';

  const range = resultInfo.referenceRange;
  if (!range?.formattedReferenceRange) return 'no-range';

  const numValue = resultInfo.numericValue;
  if (numValue == null) return 'no-range';

  const { displayLow, displayHigh } = range;

  if (displayHigh) {
    const upper = parseRangeValue(displayHigh);
    if (upper) {
      if (upper.inclusive ? numValue > upper.value : numValue >= upper.value) return 'abnormal';
    }
  }

  if (displayLow) {
    const lower = parseRangeValue(displayLow);
    if (lower) {
      if (lower.inclusive ? numValue < lower.value : numValue <= lower.value) return 'abnormal';
    }
  }

  return 'normal';
}

function getRangePosition(resultInfo: ComponentResultInfo | undefined, range: ReferenceRange | undefined): { position: number; hasRange: boolean } {
  if (!range?.formattedReferenceRange || resultInfo?.numericValue == null) return { position: 50, hasRange: false };

  const numValue = resultInfo.numericValue;
  const upper = range.displayHigh ? parseRangeValue(range.displayHigh) : null;
  const lower = range.displayLow ? parseRangeValue(range.displayLow) : null;

  if (upper && lower) {
    const rangeSpan = upper.value - lower.value;
    if (rangeSpan <= 0) return { position: 50, hasRange: true };
    const normalized = (numValue - lower.value) / rangeSpan;
    const position = 20 + normalized * 60;
    return { position: Math.max(2, Math.min(98, position)), hasRange: true };
  } else if (upper) {
    const normalized = numValue / upper.value;
    const position = normalized * 80;
    return { position: Math.max(2, Math.min(98, position)), hasRange: true };
  } else if (lower) {
    const normalized = numValue / lower.value;
    const position = normalized * 20;
    return { position: Math.max(2, Math.min(98, position)), hasRange: true };
  }

  return { position: 50, hasRange: false };
}

function HistoricalTrend({ history }: { history: HistoricalComponentResult }) {
  const dataPoints = history.historicalResultData;
  if (!dataPoints || dataPoints.length <= 1) return null;

  return (
    <details className="mt-1">
      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
        {dataPoints.length} historical values
      </summary>
      <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-border/50">
        {dataPoints.map((dp: HistoricalResultDataPoint, i: number) => {
          const status = getComponentStatus(dp as unknown as ComponentResultInfo);
          const date = dp.dateISO ? new Date(dp.dateISO).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground min-w-[80px]">{date}</span>
              <span className={`font-medium ${status === 'abnormal' ? 'text-red-600' : ''}`}>
                {dp.value} {history.units}
              </span>
              {dp.referenceRange?.formattedReferenceRange && (
                <span className="text-muted-foreground">(ref: {dp.referenceRange.formattedReferenceRange})</span>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}

function ComponentRow({ comp, history }: { comp: ResultComponent; history?: HistoricalComponentResult }) {
  const resultInfo = comp.componentResultInfo;
  const range = resultInfo?.referenceRange;
  const status = getComponentStatus(resultInfo);
  const { position, hasRange } = getRangePosition(resultInfo, range);
  const hasNumericValue = resultInfo?.numericValue != null;
  const comments = comp.componentComments;

  return (
    <div className="py-2 border-b border-border/50 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {comp.componentInfo?.name || comp.componentInfo?.commonName || "Unknown"}
            </span>
            {status === 'abnormal' && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                ABNORMAL
              </Badge>
            )}
            {status === 'normal' && hasRange && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-600 border-green-300">
                NORMAL
              </Badge>
            )}
          </div>
          {range?.formattedReferenceRange && (
            <span className="text-xs text-muted-foreground">
              Normal range: {range.formattedReferenceRange}
              {comp.componentInfo?.units ? ` ${comp.componentInfo.units}` : ''}
            </span>
          )}
        </div>
        <div className="text-right shrink-0">
          <span className={`text-sm font-semibold ${status === 'abnormal' ? 'text-red-600' : ''}`}>
            {resultInfo?.value}
          </span>
          {comp.componentInfo?.units && (
            <span className="text-xs text-muted-foreground ml-1">{comp.componentInfo.units}</span>
          )}
        </div>
      </div>

      {/* Visual range bar for numeric values */}
      {hasNumericValue && hasRange && (
        <div className="mt-1.5 relative h-2 rounded-full bg-gradient-to-r from-red-200 via-green-200 to-red-200 overflow-visible">
          <div
            className="absolute top-0 h-full bg-green-300/60 rounded-full"
            style={{
              left: range?.displayLow ? '20%' : '0%',
              right: range?.displayHigh ? '20%' : '0%',
            }}
          />
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
              status === 'abnormal' ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{ left: `${position}%`, transform: `translate(-50%, -50%)` }}
          />
        </div>
      )}

      {/* Component comments (interpretations like "NEGATIVE") */}
      {comments?.hasContent && comments.contentAsString && (
        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line break-words">
          {comments.contentAsString}
        </p>
      )}

      {/* Historical trend data */}
      {history && <HistoricalTrend history={history} />}
    </div>
  );
}

export function LabItem({ lab }: { lab: LabTestResultWithHistory }) {
  const historicalResults = lab.historicalResults?.historicalResults;

  return (
    <div className="bg-muted rounded-md p-4">
      <h4 className="font-semibold text-sm">{lab.orderName}</h4>
      {lab.results?.map((result: LabResult, j: number) => (
        <div key={j} className="mt-2">
          {/* Metadata row */}
          <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mb-2">
            {result.orderMetadata?.collectionTimestampsDisplay && (
              <span>Collected: {result.orderMetadata.collectionTimestampsDisplay}</span>
            )}
            {(result.orderMetadata?.authorizingProviderName || result.orderMetadata?.orderProviderName) && (
              <span>Ordered by: {result.orderMetadata.authorizingProviderName || result.orderMetadata.orderProviderName}</span>
            )}
            {result.orderMetadata?.resultStatus && (
              <span>Status: {result.orderMetadata.resultStatus}</span>
            )}
            {result.orderMetadata?.specimensDisplay && (
              <span>Specimen: {result.orderMetadata.specimensDisplay}</span>
            )}
          </div>

          {/* Associated diagnoses */}
          {(result.orderMetadata as OrderMetadata)?.associatedDiagnoses && (result.orderMetadata as OrderMetadata).associatedDiagnoses!.length > 0 && (
            <p className="text-xs text-muted-foreground mb-2">
              Diagnosis: {(result.orderMetadata as OrderMetadata).associatedDiagnoses!.join(', ')}
            </p>
          )}

          {/* Component results */}
          {result.resultComponents?.map((comp: ResultComponent, k: number) => {
            const compHistory = historicalResults?.[comp.componentInfo?.componentID];
            return <ComponentRow key={k} comp={comp} history={compHistory} />;
          })}

          {/* Result note */}
          {result.resultNote?.hasContent && result.resultNote.contentAsString && (
            <p className="text-xs text-muted-foreground mt-2 border-t border-border/50 pt-2">
              Note: {result.resultNote.contentAsString}
            </p>
          )}

          {/* Resulting lab info */}
          {result.orderMetadata?.resultingLab?.name && (
            <p className="text-xs text-muted-foreground mt-1">
              Lab: {result.orderMetadata.resultingLab.name}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
