/**
 * Medical event correlation engine.
 *
 * Links related events across data categories (visits, bills, labs, imaging,
 * letters, documents, medications, referrals) using date proximity and
 * provider-name matching.
 */

import type {
  ScrapeResults,
  PastVisitOrganization,
  MedicationType,
  ImagingResultType,
  LetterType,
  DocumentType,
  ReferralType,
  UpcomingOrderType,
} from "@/types/scrape-results";
import type { BillingAccount } from "@/lib/mychart/bills/bills";
import type { LabTestResultWithHistory } from "../../../scrapers/myChart/labs_and_procedure_results/labtestresulttype";
import type { BillingVisit } from "../../../scrapers/myChart/bills/types";

// ── Normalised event representation ────────────────────────────────────────

export type EventCategory =
  | 'visit'
  | 'bill'
  | 'lab'
  | 'imaging'
  | 'letter'
  | 'document'
  | 'medication'
  | 'referral'
  | 'upcomingOrder';

export interface MedicalEvent {
  category: EventCategory;
  /** Display label, e.g. "Office Visit", "Lipid Panel" */
  title: string;
  /** ISO-ish date string — only the YYYY-MM-DD portion is used for matching */
  date: string | null;
  /** Provider name as-is from MyChart (we normalise before comparison) */
  provider: string | null;
  /** Index into the source array so the UI can scroll / highlight */
  sourceIndex: number;
  /** Readable one-liner for the timeline card */
  summary: string;
}

export interface CorrelatedGroup {
  /** Representative date for the group (earliest event date) */
  date: string;
  /** All events that belong together */
  events: MedicalEvent[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Parse various date formats into YYYY-MM-DD or null */
export function normaliseDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // Already ISO  "2026-01-15"
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);

  // US format "01/10/2026" or "01/10/2026 9:15 AM"
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (usMatch) {
    const [, m, d, y] = usMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
}

/** Lowercase, strip titles (Dr./MD/NP/DO/…), collapse whitespace */
export function normaliseProvider(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(dr\.?|md|np|do|pa|rn|phd|ms|ma)\b/gi, '')
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Check if two provider name strings refer to the same person */
export function providersMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normaliseProvider(a);
  const nb = normaliseProvider(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

// ── Event extractors ───────────────────────────────────────────────────────

function extractVisits(data: ScrapeResults): MedicalEvent[] {
  const events: MedicalEvent[] = [];
  if (!data?.pastVisits?.List) return events;

  const allVisits = Object.values(data.pastVisits.List)
    .flatMap((org: PastVisitOrganization) => org.List || []);

  allVisits.forEach((v, i: number) => {
    const visitType = typeof v.VisitTypeName === 'string' ? v.VisitTypeName : '';
    const providerName = typeof v.PrimaryProviderName === 'string' ? v.PrimaryProviderName : '';
    const dateStr = typeof v.Date === 'string' ? v.Date : '';
    events.push({
      category: 'visit',
      title: visitType || 'Visit',
      date: normaliseDate(dateStr),
      provider: providerName || null,
      sourceIndex: i,
      summary: `${visitType || 'Visit'}${providerName ? ` with ${providerName}` : ''}`,
    });
  });
  return events;
}

function extractBills(data: ScrapeResults): MedicalEvent[] {
  const events: MedicalEvent[] = [];
  if (!Array.isArray(data?.billing)) return events;

  let idx = 0;
  for (const account of data.billing as BillingAccount[]) {
    const visits: BillingVisit[] = [
      ...(account.billingDetails?.Data?.UnifiedVisitList || []),
      ...(account.billingDetails?.Data?.InformationalVisitList || []),
    ];
    for (const v of visits) {
      events.push({
        category: 'bill',
        title: v.Description || 'Billing Item',
        date: normaliseDate(v.StartDateDisplay),
        provider: v.Provider || null,
        sourceIndex: idx++,
        summary: `Bill: ${v.Description || 'Unknown'}${v.SelfAmountDue ? ` ($${v.SelfAmountDue} owed)` : ''}`,
      });
    }
  }
  return events;
}

function extractLabs(data: ScrapeResults): MedicalEvent[] {
  const events: MedicalEvent[] = [];
  if (!Array.isArray(data?.labResults)) return events;

  data.labResults.forEach((lab: LabTestResultWithHistory, i: number) => {
    const result = lab.results?.[0];
    const dateStr = result?.orderMetadata?.resultTimestampDisplay || null;
    events.push({
      category: 'lab',
      title: lab.orderName || 'Lab Test',
      date: normaliseDate(dateStr),
      provider: result?.orderMetadata?.orderProviderName || null,
      sourceIndex: i,
      summary: `Lab: ${lab.orderName || 'Unknown'}`,
    });
  });
  return events;
}

function extractImaging(data: ScrapeResults): MedicalEvent[] {
  const events: MedicalEvent[] = [];
  if (!Array.isArray(data?.imagingResults)) return events;

  data.imagingResults.forEach((img: ImagingResultType, i: number) => {
    events.push({
      category: 'imaging',
      title: img.orderName || 'Imaging',
      date: normaliseDate(img.resultDate),
      provider: img.orderProvider || null,
      sourceIndex: i,
      summary: `Imaging: ${img.orderName || 'Unknown'}`,
    });
  });
  return events;
}

function extractLetters(data: ScrapeResults): MedicalEvent[] {
  const events: MedicalEvent[] = [];
  if (!Array.isArray(data?.letters)) return events;

  data.letters.forEach((l: LetterType, i: number) => {
    events.push({
      category: 'letter',
      title: l.reason || 'Letter',
      date: normaliseDate(l.dateISO),
      provider: l.providerName || null,
      sourceIndex: i,
      summary: `Letter: ${l.reason || 'Unknown'}`,
    });
  });
  return events;
}

function extractDocuments(data: ScrapeResults): MedicalEvent[] {
  const events: MedicalEvent[] = [];
  if (!Array.isArray(data?.documents)) return events;

  data.documents.forEach((doc: DocumentType, i: number) => {
    events.push({
      category: 'document',
      title: doc.title || 'Document',
      date: normaliseDate(doc.date),
      provider: doc.providerName || null,
      sourceIndex: i,
      summary: `Document: ${doc.title || 'Unknown'}`,
    });
  });
  return events;
}

function extractMedications(data: ScrapeResults): MedicalEvent[] {
  const events: MedicalEvent[] = [];
  const meds = data?.medications?.medications;
  if (!Array.isArray(meds)) return events;

  meds.forEach((med: MedicationType, i: number) => {
    const dateStr = med.startDate || med.dateToDisplay || null;
    events.push({
      category: 'medication',
      title: med.name || med.commonName || 'Medication',
      date: normaliseDate(dateStr),
      provider: med.authorizingProviderName || med.orderingProviderName || null,
      sourceIndex: i,
      summary: `Medication: ${med.name || 'Unknown'}`,
    });
  });
  return events;
}

function extractReferrals(data: ScrapeResults): MedicalEvent[] {
  const events: MedicalEvent[] = [];
  if (!Array.isArray(data?.referrals)) return events;

  data.referrals.forEach((ref: ReferralType, i: number) => {
    events.push({
      category: 'referral',
      title: `Referral to ${ref.referredToProviderName || 'specialist'}`,
      date: normaliseDate(ref.creationDate || ref.startDate),
      provider: ref.referredByProviderName || null,
      sourceIndex: i,
      summary: `Referral: ${ref.referredByProviderName || '?'} → ${ref.referredToProviderName || '?'}`,
    });
  });
  return events;
}

function extractUpcomingOrders(data: ScrapeResults): MedicalEvent[] {
  const events: MedicalEvent[] = [];
  if (!Array.isArray(data?.upcomingOrders)) return events;

  data.upcomingOrders.forEach((order: UpcomingOrderType, i: number) => {
    events.push({
      category: 'upcomingOrder',
      title: order.orderName || 'Order',
      date: normaliseDate(order.orderedDate),
      provider: order.orderedByProvider || null,
      sourceIndex: i,
      summary: `Order: ${order.orderName || 'Unknown'} (${order.status || ''})`,
    });
  });
  return events;
}

// ── Main correlation logic ─────────────────────────────────────────────────

/**
 * Build correlated groups from scraped data.
 *
 * Strategy:
 * 1. Normalise every event into {category, date, provider, title}.
 * 2. Bucket events by normalised date.
 * 3. Within each date bucket, merge events that share a provider into a single
 *    group.  Events without a provider match get their own singleton groups.
 * 4. For letters/documents whose date is within ±5 days of a visit *by the
 *    same provider*, merge them into that visit's group (after-visit summaries
 *    often have slightly different dates).
 * 5. Return groups sorted by date descending (newest first), with events
 *    within each group sorted by a stable category order.
 */
export function correlateEvents(data: ScrapeResults | null | undefined): CorrelatedGroup[] {
  if (!data) return [];

  // 1. Extract all events
  const allEvents: MedicalEvent[] = [
    ...extractVisits(data),
    ...extractBills(data),
    ...extractLabs(data),
    ...extractImaging(data),
    ...extractLetters(data),
    ...extractDocuments(data),
    ...extractMedications(data),
    ...extractReferrals(data),
    ...extractUpcomingOrders(data),
  ];

  // 2. Bucket by date
  const byDate = new Map<string, MedicalEvent[]>();
  const undated: MedicalEvent[] = [];

  for (const ev of allEvents) {
    if (ev.date) {
      const bucket = byDate.get(ev.date) || [];
      bucket.push(ev);
      byDate.set(ev.date, bucket);
    } else {
      undated.push(ev);
    }
  }

  // 3. Within each date bucket, group events that share a provider
  const groups: CorrelatedGroup[] = [];

  for (const [date, events] of byDate) {
    const used = new Set<number>();
    const eventIdx = events.map((e, i) => ({ ...e, _i: i }));

    for (let i = 0; i < eventIdx.length; i++) {
      if (used.has(i)) continue;
      const group: MedicalEvent[] = [events[i]];
      used.add(i);

      for (let j = i + 1; j < eventIdx.length; j++) {
        if (used.has(j)) continue;
        // Same date already — merge if providers match OR one has no provider
        if (
          providersMatch(events[i].provider, events[j].provider) ||
          !events[i].provider ||
          !events[j].provider
        ) {
          group.push(events[j]);
          used.add(j);
        }
      }

      groups.push({ date, events: group });
    }
  }

  // 4. Fuzzy-date merge: letters/documents/bills within ±5 days of a visit by same provider
  const FUZZY_DAYS = 5;
  const FUZZY_CATEGORIES: Set<EventCategory> = new Set(['letter', 'document', 'bill', 'lab', 'imaging']);
  const visitGroups = groups.filter(g =>
    g.events.some(e => e.category === 'visit')
  );

  // Find singleton groups eligible for fuzzy merging
  const singletonIndices: number[] = [];
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (
      g.events.length === 1 &&
      FUZZY_CATEGORIES.has(g.events[0].category)
    ) {
      singletonIndices.push(i);
    }
  }

  const toRemove = new Set<number>();

  for (const sIdx of singletonIndices) {
    const singleton = groups[sIdx].events[0];
    if (!singleton.date) continue;

    const sDate = new Date(singleton.date);
    let bestGroup: CorrelatedGroup | null = null;
    let bestDist = Infinity;

    for (const vg of visitGroups) {
      const vDate = new Date(vg.date);
      const dist = Math.abs(sDate.getTime() - vDate.getTime()) / 86400000;
      if (dist > 0 && dist <= FUZZY_DAYS && dist < bestDist) {
        // Check provider match
        const visitProviders = vg.events
          .filter(e => e.category === 'visit')
          .map(e => e.provider);
        if (visitProviders.some(vp => providersMatch(vp, singleton.provider))) {
          bestGroup = vg;
          bestDist = dist;
        }
      }
    }

    if (bestGroup) {
      bestGroup.events.push(singleton);
      toRemove.add(sIdx);
    }
  }

  // Remove merged singletons (iterate in reverse to keep indices valid)
  const filteredGroups = groups.filter((_, i) => !toRemove.has(i));

  // 5. Sort groups by date descending, events within by category order
  const categoryOrder: Record<EventCategory, number> = {
    visit: 0,
    lab: 1,
    imaging: 2,
    bill: 3,
    letter: 4,
    document: 5,
    medication: 6,
    referral: 7,
    upcomingOrder: 8,
  };

  for (const g of filteredGroups) {
    g.events.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);
  }

  // Only return groups with 2+ events (single events aren't "correlated")
  return filteredGroups
    .filter(g => g.events.length >= 2)
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ── Lookup helpers for the UI ──────────────────────────────────────────────

const CATEGORY_LABELS: Record<EventCategory, string> = {
  visit: 'Visit',
  bill: 'Bill',
  lab: 'Lab Result',
  imaging: 'Imaging',
  letter: 'Letter',
  document: 'Document',
  medication: 'Medication',
  referral: 'Referral',
  upcomingOrder: 'Order',
};

export function categoryLabel(cat: EventCategory): string {
  return CATEGORY_LABELS[cat];
}

const CATEGORY_COLORS: Record<EventCategory, string> = {
  visit: 'bg-blue-100 text-blue-800',
  bill: 'bg-amber-100 text-amber-800',
  lab: 'bg-green-100 text-green-800',
  imaging: 'bg-purple-100 text-purple-800',
  letter: 'bg-rose-100 text-rose-800',
  document: 'bg-indigo-100 text-indigo-800',
  medication: 'bg-teal-100 text-teal-800',
  referral: 'bg-orange-100 text-orange-800',
  upcomingOrder: 'bg-gray-100 text-gray-800',
};

export function categoryColor(cat: EventCategory): string {
  return CATEGORY_COLORS[cat];
}
