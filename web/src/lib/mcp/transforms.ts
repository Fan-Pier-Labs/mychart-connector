/**
 * Response transforms for MCP tool outputs.
 *
 * Raw MyChart JSON is packed with encrypted keys, nested HTML/CSS, historical
 * result arrays, empty metadata fields, and UI-specific flags that an AI
 * consumer will never use. These transforms strip each response down to only
 * the fields an AI would act on, cutting response sizes by 80-90%.
 */

import type { LabTestResultWithHistory } from '../../../../scrapers/myChart/labs_and_procedure_results/labtestresulttype';
import type { BillingAccount } from '../../../../scrapers/myChart/bills/types';
import type { ConversationListResponse } from '../../../../scrapers/myChart/messages/conversations';
import type { ImagingResult } from '../../../../scrapers/myChart/labs_and_procedure_results/labtestresulttype';
import type { LinkedMyChart } from '../../../../scrapers/myChart/other_mycharts/other_mycharts';

// ---------------------------------------------------------------------------
// Lab Results
// ---------------------------------------------------------------------------

export interface TrimmedLabResult {
  orderName: string;
  date: string;
  status: string;
  provider: string;
  isAbnormal: boolean;
  components: {
    name: string;
    value: string;
    units: string;
    range: string;
    abnormal: boolean;
  }[];
  narrative?: string;
  impression?: string;
  note?: string;
}

export function trimLabResults(raw: LabTestResultWithHistory[]): TrimmedLabResult[] {
  const results: TrimmedLabResult[] = [];

  for (const order of raw) {
    for (const result of order.results ?? []) {
      results.push({
        orderName: order.orderName,
        date: result.orderMetadata?.resultTimestampDisplay ?? '',
        status: result.orderMetadata?.resultStatus ?? '',
        provider: result.orderMetadata?.orderProviderName ?? '',
        isAbnormal: result.isAbnormal ?? false,
        components: (result.resultComponents ?? []).map(c => ({
          name: c.componentInfo?.name ?? c.componentInfo?.commonName ?? '',
          value: c.componentResultInfo?.value ?? '',
          units: c.componentInfo?.units ?? '',
          range: c.componentResultInfo?.referenceRange?.formattedReferenceRange ?? '',
          abnormal: c.componentResultInfo?.abnormalFlagCategoryValue !== 0 &&
                    c.componentResultInfo?.abnormalFlagCategoryValue !== '0' &&
                    c.componentResultInfo?.abnormalFlagCategoryValue !== '',
        })),
        ...(result.studyResult?.narrative?.hasContent
          ? { narrative: result.studyResult.narrative.contentAsString }
          : {}),
        ...(result.studyResult?.impression?.hasContent
          ? { impression: result.studyResult.impression.contentAsString }
          : {}),
        ...(result.resultNote?.hasContent
          ? { note: result.resultNote.contentAsString }
          : {}),
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export interface TrimmedBillingProcedure {
  description: string;
  amount: string;
  selfAmountDue: string;
}

export interface TrimmedBillingVisit {
  date: string;
  description: string | null;
  provider: string | null;
  payer: string | null;
  chargeAmount: string | null;
  insurancePaid: string | null;
  selfAmountDue: string | null;
  status: string;
  procedures?: TrimmedBillingProcedure[];
  coverageSummary?: {
    name: string;
    billed: string;
    deductible: string;
    copay: string | null;
    coinsurance: string | null;
    notCovered: string | null;
  }[];
}

export interface TrimmedBillingPayment {
  date: string;
  description: string;
  amount: string;
  paymentMethod: string | null;
}

export interface TrimmedBillingAccount {
  guarantorNumber: string;
  patientName: string;
  amountDue?: number;
  visits: TrimmedBillingVisit[];
  payments: TrimmedBillingPayment[];
  statements: {
    date: string;
    description: string;
    amount: string;
    isExplanationOfBenefits: boolean;
  }[];
}

function billingStatusLabel(statusCode: number): string {
  const map: Record<number, string> = {
    0: 'open',
    1: 'closed',
    2: 'pending',
    3: 'outstanding',
    7: 'paid_off',
    8: 'closed',
    9: 'closed',
  };
  return map[statusCode] ?? `status_${statusCode}`;
}

/** Strip HTML tags from payment method display (e.g. img tags for card brand) and return clean text */
function extractPaymentMethod(htmlSubText: string | null): string | null {
  if (!htmlSubText) return null;
  // Extract alt text from img tag (card brand) + remaining text
  const altMatch = htmlSubText.match(/alt="([^"]+)"/);
  const brand = altMatch?.[1] ?? '';
  const textOnly = htmlSubText.replace(/<[^>]+>/g, '').trim();
  return brand ? `${brand} ${textOnly}`.trim() : textOnly || null;
}

export function trimBilling(raw: BillingAccount[]): TrimmedBillingAccount[] {
  return raw.map(acct => {
    const allVisits = [
      ...(acct.billingDetails?.Data?.UnifiedVisitList ?? []),
      ...(acct.billingDetails?.Data?.InformationalVisitList ?? []),
    ];

    return {
      guarantorNumber: acct.guarantorNumber,
      patientName: acct.patientName,
      amountDue: acct.amountDue,
      visits: allVisits.map(v => ({
        date: v.StartDateDisplay ?? v.DateRangeDisplay ?? '',
        description: v.Description,
        provider: v.Provider,
        payer: v.PrimaryPayer,
        chargeAmount: v.ChargeAmount,
        insurancePaid: v.InsurancePaymentAmount,
        selfAmountDue: v.SelfAmountDue,
        status: billingStatusLabel(v.PatFriendlyAccountStatus),
        ...(v.ProcedureList && v.ProcedureList.length > 0
          ? {
              procedures: v.ProcedureList.map(p => ({
                description: p.Description.replace(/<[^>]+>/g, '').trim(),
                amount: p.Amount,
                selfAmountDue: p.SelfAmountDue,
              })),
            }
          : {}),
        ...(v.CoverageInfoList && v.CoverageInfoList.length > 0
          ? {
              coverageSummary: v.CoverageInfoList.map(c => ({
                name: c.CoverageName,
                billed: c.Billed,
                deductible: c.Deductible,
                copay: c.Copay,
                coinsurance: c.Coinsurance,
                notCovered: c.NotCovered,
              })),
            }
          : {}),
      })),
      payments: (acct.paymentList?.Data?.PaymentList ?? []).map(p => ({
        date: p.FormattedDateDisplay ?? '',
        description: p.Description,
        amount: p.PaymentAmountDisplay,
        paymentMethod: extractPaymentMethod(p.HtmlSubText),
      })),
      statements: [
        ...(acct.statementList?.DataStatement?.StatementList ?? []),
        ...(acct.statementList?.DataDetailBill?.StatementList ?? []),
      ].map(s => ({
        date: s.FormattedDateDisplay ?? s.DateDisplay,
        description: s.Description,
        amount: s.StatementAmountDisplay,
        isExplanationOfBenefits: s.IsEB,
      })),
    };
  });
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/** Strip HTML tags, collapse whitespace */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(div|p|span|table|tr|td|th|thead|tbody|ul|ol|li|a|b|i|em|strong|h[1-6]|style|head|html|body|img|hr|blockquote|pre|code)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#?\w+;/gi, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface TrimmedMessage {
  subject?: string;
  date?: string;
  author?: string;
  body: string;
}

export interface TrimmedConversation {
  subject?: string;
  lastMessageDate?: string;
  senderName?: string;
  previewText?: string;
  messages: TrimmedMessage[];
}

export function trimMessages(raw: ConversationListResponse | null): TrimmedConversation[] {
  if (!raw) return [];

  const conversations = [
    ...(raw.conversations ?? []),
    ...(raw.threads ?? []),
  ];

  return conversations.map(conv => ({
    subject: conv.subject,
    lastMessageDate: conv.lastMessageDateDisplay,
    senderName: conv.senderName,
    previewText: conv.previewText ?? conv.preview,
    messages: (conv.messages ?? []).map(msg => ({
      ...(msg.author?.displayName ? { author: msg.author.displayName } : {}),
      ...(msg.deliveryInstantISO ? { date: msg.deliveryInstantISO } : {}),
      body: msg.body ? stripHtml(msg.body) : '',
    })),
  }));
}

// ---------------------------------------------------------------------------
// Imaging Results
// ---------------------------------------------------------------------------

export interface TrimmedImagingResult {
  orderName: string;
  date: string;
  provider: string;
  reportText?: string;
  impression?: string;
  narrative?: string;
  hasImages: boolean;
}

export function trimImagingResults(raw: ImagingResult[]): TrimmedImagingResult[] {
  return raw.map(img => {
    const firstResult = img.results?.[0];
    const narrativeParts: string[] = [];
    const impressionParts: string[] = [];

    for (const r of img.results ?? []) {
      if (r.studyResult?.narrative?.hasContent) {
        narrativeParts.push(r.studyResult.narrative.contentAsString);
      }
      if (r.studyResult?.impression?.hasContent) {
        impressionParts.push(r.studyResult.impression.contentAsString);
      }
    }

    return {
      orderName: img.orderName,
      date: firstResult?.orderMetadata?.resultTimestampDisplay ?? '',
      provider: firstResult?.orderMetadata?.orderProviderName ?? '',
      ...(img.reportText ? { reportText: img.reportText } : {}),
      ...(impressionParts.length > 0 ? { impression: impressionParts.join('\n\n') } : {}),
      ...(narrativeParts.length > 0 ? { narrative: narrativeParts.join('\n\n') } : {}),
      hasImages: img.results?.some(r =>
        (r.imageStudies && r.imageStudies.length > 0) ||
        (r.scans && r.scans.length > 0)
      ) ?? false,
    };
  });
}

// ---------------------------------------------------------------------------
// Linked MyChart Accounts
// ---------------------------------------------------------------------------

export interface TrimmedLinkedAccount {
  name: string;
  lastEncounter: string | null;
}

export function trimLinkedAccounts(raw: LinkedMyChart[]): TrimmedLinkedAccount[] {
  return raw.map(({ name, lastEncounter }) => ({ name, lastEncounter }));
}

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------

export function paginate<T>(items: T[], limit?: number, offset?: number): T[] {
  const start = offset ?? 0;
  const end = limit != null ? start + limit : undefined;
  return items.slice(start, end);
}
