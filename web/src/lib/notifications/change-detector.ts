import type { MyChartRequest } from '@/lib/mychart/myChartRequest';
import type { FhirClient } from '@/lib/fhir/client';
import {
  mapMedicationRequests,
  mapAllergyIntolerances,
  mapConditions,
  mapObservationsToLabResults,
  mapDocumentReferences,
  mapPatientToProfile,
} from '@/lib/fhir/mappers';
import { listConversationsWithFullHistory } from '@/lib/mychart/messages/conversationsWithFullHistory';
import { listLabResults } from '@/lib/mychart/labs/labResults';
import { getImagingResults } from '@/lib/mychart/imagingResults';
import { getMedications } from '@/lib/mychart/medications';
import { getLetters } from '@/lib/mychart/letters';
import { upcomingVisits } from '@/lib/mychart/visits/visits';
import { getActivityFeed } from '@/lib/mychart/activityFeed';
import { getDocuments } from '@/lib/mychart/documents';
import { getAllergies } from '@/lib/mychart/allergies';
import { getHealthIssues } from '@/lib/mychart/healthIssues';
import type { ImagingResult } from '@/lib/mychart/imagingResults';

export interface CategoryChange {
  category: string;
  newItems: Record<string, unknown>[];
}

export interface DetectedChanges {
  changes: CategoryChange[];
  newImagingResults: ImagingResult[];
}

/**
 * Try to parse a date string. Returns null if unparseable.
 */
function tryParseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * Filter items that have a timestamp newer than the cutoff.
 */
function filterNewItems<T>(
  items: T[],
  getTimestamp: (item: T) => string | undefined | null,
  cutoff: Date
): T[] {
  return items.filter((item) => {
    const d = tryParseDate(getTimestamp(item));
    return d && d > cutoff;
  });
}

/**
 * Detect changes across 10 MyChart categories since lastCheckedAt.
 */
export async function detectChanges(
  mychartRequest: MyChartRequest,
  lastCheckedAt: Date
): Promise<DetectedChanges> {
  const changes: CategoryChange[] = [];
  const newImagingResults: ImagingResult[] = [];

  const scrapers: {
    category: string;
    run: () => Promise<void>;
  }[] = [
    {
      category: 'Messages',
      run: async () => {
        const data = await listConversationsWithFullHistory(mychartRequest);
        const newMessages: Record<string, unknown>[] = [];
        for (const conv of data.conversations) {
          for (const msg of conv.messages) {
            const d = tryParseDate(msg.sentDate);
            if (d && d > lastCheckedAt) {
              newMessages.push({
                subject: conv.subject,
                senderName: msg.senderName,
                preview: msg.messageBody.substring(0, 200),
                sentDate: msg.sentDate,
              });
            }
          }
        }
        if (newMessages.length > 0) {
          changes.push({ category: 'Messages', newItems: newMessages });
        }
      },
    },
    {
      category: 'Lab Results',
      run: async () => {
        const results = await listLabResults(mychartRequest);
        const newItems: Record<string, unknown>[] = [];
        for (const lab of results) {
          for (const result of lab.results) {
            const d = tryParseDate(result.orderMetadata.prioritizedInstantISO);
            if (d && d > lastCheckedAt) {
              newItems.push({
                orderName: lab.orderName,
                resultName: result.name,
                status: result.orderMetadata.resultStatus,
                isAbnormal: result.isAbnormal,
                date: result.orderMetadata.prioritizedInstantISO,
              });
            }
          }
        }
        if (newItems.length > 0) {
          changes.push({ category: 'Lab Results', newItems });
        }
      },
    },
    {
      category: 'Imaging Results',
      run: async () => {
        const results = await getImagingResults(mychartRequest);
        const newItems: Record<string, unknown>[] = [];
        for (const imaging of results) {
          for (const result of imaging.results) {
            const d = tryParseDate(result.orderMetadata.prioritizedInstantISO);
            if (d && d > lastCheckedAt) {
              newItems.push({
                orderName: imaging.orderName,
                resultName: result.name,
                reportText: imaging.reportText,
                date: result.orderMetadata.prioritizedInstantISO,
              });
              if (imaging.fdiContext) {
                newImagingResults.push(imaging);
              }
            }
          }
        }
        if (newItems.length > 0) {
          changes.push({ category: 'Imaging Results', newItems });
        }
      },
    },
    {
      category: 'Medications',
      run: async () => {
        const data = await getMedications(mychartRequest);
        const newItems = filterNewItems(
          data.medications,
          (m) => m.dateToDisplay,
          lastCheckedAt
        );
        if (newItems.length > 0) {
          changes.push({
            category: 'Medications',
            newItems: newItems.map((m) => ({
              name: m.name,
              commonName: m.commonName,
              sig: m.sig,
              date: m.dateToDisplay,
            })),
          });
        }
      },
    },
    {
      category: 'Letters',
      run: async () => {
        const letters = await getLetters(mychartRequest);
        const newItems = filterNewItems(letters, (l) => l.dateISO, lastCheckedAt);
        if (newItems.length > 0) {
          changes.push({
            category: 'Letters',
            newItems: newItems.map((l) => ({
              reason: l.reason,
              providerName: l.providerName,
              date: l.dateISO,
            })),
          });
        }
      },
    },
    {
      category: 'Upcoming Visits',
      run: async () => {
        const data = await upcomingVisits(mychartRequest);
        const allVisits = [
          ...(data.NextNDaysVisits ?? []),
          ...(data.LaterVisitsList ?? []),
          ...(data.InProgressVisits ?? []),
        ];
        const newItems = filterNewItems(allVisits, (v) => v.PrimaryDate, lastCheckedAt);
        if (newItems.length > 0) {
          changes.push({
            category: 'Upcoming Visits',
            newItems: newItems.map((v) => ({
              type: v.VisitTypeName,
              date: v.PrimaryDate,
            })),
          });
        }
      },
    },
    {
      category: 'Activity Feed',
      run: async () => {
        const items = await getActivityFeed(mychartRequest);
        const newItems = filterNewItems(items, (a) => a.date, lastCheckedAt);
        if (newItems.length > 0) {
          changes.push({
            category: 'Activity Feed',
            newItems: newItems.map((a) => ({
              title: a.title,
              description: a.description,
              date: a.date,
            })),
          });
        }
      },
    },
    {
      category: 'Documents',
      run: async () => {
        const docs = await getDocuments(mychartRequest);
        const newItems = filterNewItems(docs, (d) => d.date, lastCheckedAt);
        if (newItems.length > 0) {
          changes.push({
            category: 'Documents',
            newItems: newItems.map((d) => ({
              title: d.title,
              documentType: d.documentType,
              providerName: d.providerName,
              date: d.date,
            })),
          });
        }
      },
    },
    {
      category: 'Allergies',
      run: async () => {
        const data = await getAllergies(mychartRequest);
        const newItems = filterNewItems(
          data.allergies,
          (a) => a.formattedDateNoted,
          lastCheckedAt
        );
        if (newItems.length > 0) {
          changes.push({
            category: 'Allergies',
            newItems: newItems.map((a) => ({
              name: a.name,
              type: a.type,
              reaction: a.reaction,
              date: a.formattedDateNoted,
            })),
          });
        }
      },
    },
    {
      category: 'Health Issues',
      run: async () => {
        const issues = await getHealthIssues(mychartRequest);
        const newItems = filterNewItems(
          issues,
          (h) => h.formattedDateNoted,
          lastCheckedAt
        );
        if (newItems.length > 0) {
          changes.push({
            category: 'Health Issues',
            newItems: newItems.map((h) => ({
              name: h.name,
              date: h.formattedDateNoted,
            })),
          });
        }
      },
    },
  ];

  // Run scrapers sequentially to avoid overwhelming MyChart
  for (const scraper of scrapers) {
    try {
      await scraper.run();
    } catch (err) {
      console.warn(`[notifications] Failed to check ${scraper.category}:`, (err as Error).message);
    }
  }

  return { changes, newImagingResults };
}

/**
 * Detect changes for FHIR connections.
 * Checks a subset of categories (no messaging, billing, imaging CLO, etc.).
 * Uses FHIR _lastUpdated search parameter where possible.
 */
export async function detectChangesFhir(
  client: FhirClient,
  lastCheckedAt: Date
): Promise<DetectedChanges> {
  const changes: CategoryChange[] = [];

  const checkers: { category: string; run: () => Promise<void> }[] = [
    {
      category: 'Lab Results',
      run: async () => {
        const observations = await client.getObservations('laboratory');
        const mapped = mapObservationsToLabResults(observations);
        // Simple: report all results as new items for the notification
        // FHIR doesn't provide the same timestamp granularity, so we check date
        const newItems: Record<string, unknown>[] = [];
        for (const lab of mapped) {
          for (const result of lab.results) {
            const d = tryParseDate(result.orderMetadata.resultTimestampDisplay);
            if (d && d > lastCheckedAt) {
              newItems.push({
                orderName: lab.orderName,
                resultName: result.name,
                status: result.orderMetadata.resultStatus,
                isAbnormal: result.isAbnormal,
              });
            }
          }
        }
        if (newItems.length > 0) {
          changes.push({ category: 'Lab Results', newItems });
        }
      },
    },
    {
      category: 'Medications',
      run: async () => {
        const resources = await client.getMedicationRequests();
        const patient = await client.getPatient();
        const name = mapPatientToProfile(patient).name;
        const data = mapMedicationRequests(resources, name);
        const newItems = filterNewItems(data.medications, (m) => m.dateToDisplay, lastCheckedAt);
        if (newItems.length > 0) {
          changes.push({
            category: 'Medications',
            newItems: newItems.map((m) => ({ name: m.name, sig: m.sig, date: m.dateToDisplay })),
          });
        }
      },
    },
    {
      category: 'Allergies',
      run: async () => {
        const resources = await client.getAllergyIntolerances();
        const data = mapAllergyIntolerances(resources);
        const newItems = filterNewItems(data.allergies, (a) => a.formattedDateNoted, lastCheckedAt);
        if (newItems.length > 0) {
          changes.push({
            category: 'Allergies',
            newItems: newItems.map((a) => ({ name: a.name, type: a.type, reaction: a.reaction })),
          });
        }
      },
    },
    {
      category: 'Health Issues',
      run: async () => {
        const resources = await client.getConditions();
        const data = mapConditions(resources);
        const newItems = filterNewItems(data, (h) => h.formattedDateNoted, lastCheckedAt);
        if (newItems.length > 0) {
          changes.push({
            category: 'Health Issues',
            newItems: newItems.map((h) => ({ name: h.name, date: h.formattedDateNoted })),
          });
        }
      },
    },
    {
      category: 'Documents',
      run: async () => {
        const resources = await client.getDocumentReferences();
        const data = mapDocumentReferences(resources);
        const newItems = filterNewItems(data, (d) => d.date, lastCheckedAt);
        if (newItems.length > 0) {
          changes.push({
            category: 'Documents',
            newItems: newItems.map((d) => ({ title: d.title, type: d.documentType, date: d.date })),
          });
        }
      },
    },
  ];

  for (const checker of checkers) {
    try {
      await checker.run();
    } catch (err) {
      console.warn(`[notifications/fhir] Failed to check ${checker.category}:`, (err as Error).message);
    }
  }

  return { changes, newImagingResults: [] };
}
