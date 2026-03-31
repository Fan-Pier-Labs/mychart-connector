import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/sessions';
import { sendTelemetryEvent } from '../../../../../shared/telemetry';
import { getMyChartProfile, getEmail } from '@/lib/mychart/profile';
import { getBillingHistory } from '@/lib/mychart/bills/bills';
import { upcomingVisits, pastVisits } from '@/lib/mychart/visits/visits';
import { listLabResults } from '@/lib/mychart/labs/labResults';
import { listConversationsWithFullHistory } from '@/lib/mychart/messages/conversationsWithFullHistory';
import { getMedications } from '@/lib/mychart/medications';
import { getAllergies } from '@/lib/mychart/allergies';
import { getImmunizations } from '@/lib/mychart/immunizations';
import { getInsurance } from '@/lib/mychart/insurance';
import { getCareTeam } from '@/lib/mychart/careTeam';
import { getReferrals } from '@/lib/mychart/referrals';
import { getHealthSummary } from '@/lib/mychart/healthSummary';
import { getLetters } from '@/lib/mychart/letters';
import { getHealthIssues } from '@/lib/mychart/healthIssues';
import { getPreventiveCare } from '@/lib/mychart/preventiveCare';
import { getMedicalHistory } from '@/lib/mychart/medicalHistory';
import { getVitals } from '@/lib/mychart/vitals';
import { getEmergencyContacts } from '@/lib/mychart/emergencyContacts';
import { getDocuments } from '@/lib/mychart/documents';
import { getGoals } from '@/lib/mychart/goals';
import { getUpcomingOrders } from '@/lib/mychart/upcomingOrders';
import { getQuestionnaires } from '@/lib/mychart/questionnaires';
import { getCareJourneys } from '@/lib/mychart/careJourneys';
import { getActivityFeed } from '@/lib/mychart/activityFeed';
import { getEducationMaterials } from '@/lib/mychart/educationMaterials';
import { getEhiExportTemplates } from '@/lib/mychart/ehiExport';
import { getImagingResults } from '@/lib/mychart/imagingResults';
import { getLinkedMyChartAccounts } from '@/lib/mychart/linkedMyChartAccounts';

/**
 * Normalize a raw visit object from any MyChart instance into the canonical
 * UpcomingVisit shape. Some instances (e.g. UCLA) return simplified objects
 * with keys like {Patient, Physician, Department, Date, Time} instead of the
 * standard Epic format {Date, Time, VisitTypeName, PrimaryProviderName, PrimaryDepartment, ...}.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeVisit(raw: any): {
  Date: string;
  Time?: string;
  VisitTypeName: string;
  PrimaryProviderName?: string;
  PrimaryDepartment?: { Name: string };
  Location?: string;
} {
  // Already in standard format
  if (typeof raw.VisitTypeName === 'string') {
    // Standard Epic visits store location info in PrimaryDepartment.Address
    const deptAddr = raw.PrimaryDepartment?.Address;
    const location = Array.isArray(deptAddr) ? deptAddr.filter(Boolean).join(', ') : undefined;
    return {
      Date: String(raw.Date ?? ''),
      Time: raw.Time != null ? String(raw.Time) : undefined,
      VisitTypeName: raw.VisitTypeName,
      PrimaryProviderName: typeof raw.PrimaryProviderName === 'string' ? raw.PrimaryProviderName : undefined,
      PrimaryDepartment: raw.PrimaryDepartment?.Name
        ? { Name: String(raw.PrimaryDepartment.Name) }
        : undefined,
      Location: location || undefined,
    };
  }

  // Alternate format: {Patient, Physician, Department, Date, Time}
  // Department = clinical specialty (e.g. "Internal Medicine")
  // Location = physical place (e.g. "Springfield General Hospital")
  const visitType = [raw.VisitType, raw.VisitTypeName, raw.Type, raw.type]
    .find(v => typeof v === 'string' && v.trim());
  const dept = typeof raw.Department === 'string' ? raw.Department.trim() : undefined;
  const location = typeof raw.Location === 'string' ? raw.Location.trim() : undefined;
  return {
    Date: String(raw.Date ?? ''),
    Time: raw.Time != null ? String(raw.Time) : undefined,
    VisitTypeName: visitType ?? 'Visit',
    PrimaryProviderName: String(raw.Physician ?? raw.Provider ?? raw.PrimaryProviderName ?? raw.provider ?? '').trim() || undefined,
    PrimaryDepartment: (dept || raw.PrimaryDepartment?.Name)
      ? { Name: String(dept ?? raw.PrimaryDepartment?.Name ?? '') }
      : undefined,
    Location: location || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeVisitList(visits: any): any[] | undefined {
  if (!Array.isArray(visits)) return undefined;
  return visits.map(normalizeVisit);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeUpcomingVisits(raw: any) {
  if (!raw || raw.error) return raw;
  // Handle case where response is a flat array of visits
  if (Array.isArray(raw)) {
    return { LaterVisitsList: raw.map(normalizeVisit) };
  }
  return {
    ...raw,
    LaterVisitsList: normalizeVisitList(raw.LaterVisitsList),
    NextNDaysVisits: normalizeVisitList(raw.NextNDaysVisits),
    InProgressVisits: normalizeVisitList(raw.InProgressVisits),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePastVisits(raw: any) {
  if (!raw || raw.error) return raw;
  const list = raw.List;
  if (!list || typeof list !== 'object') return raw;

  // Handle case where List is a flat array of visits (some instances return this)
  if (Array.isArray(list)) {
    return {
      ...raw,
      List: { default: { List: list.map(normalizeVisit) } },
    };
  }

  const normalized: Record<string, { List: ReturnType<typeof normalizeVisit>[] }> = {};
  for (const [orgKey, org] of Object.entries(list)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orgData = org as any;
    if (Array.isArray(orgData)) {
      // Org value is directly an array of visits
      normalized[orgKey] = { List: orgData.map(normalizeVisit) };
    } else if (orgData && typeof orgData === 'object' && Array.isArray(orgData.List)) {
      // Standard format: org has a List property
      normalized[orgKey] = {
        ...orgData,
        List: orgData.List.map(normalizeVisit),
      };
    } else if (orgData && typeof orgData === 'object' && orgData.List && typeof orgData.List === 'object' && !Array.isArray(orgData.List)) {
      // org.List is a plain object (not array) — treat its values as a map of visit objects
      normalized[orgKey] = {
        ...orgData,
        List: Object.values(orgData.List).filter(Boolean).map((v) => normalizeVisit(v as Record<string, unknown>)),
      };
    } else if (orgData && typeof orgData === 'object' && ('Patient' in orgData || 'Physician' in orgData || 'Date' in orgData)) {
      // Org value is itself a visit object (flat structure with numeric keys)
      normalized[orgKey] = { List: [normalizeVisit(orgData)] };
    } else {
      normalized[orgKey] = { ...orgData, List: [] };
    }
  }
  return { ...raw, List: normalized };
}

export async function POST(req: NextRequest) {
  sendTelemetryEvent('api_scrape_start', { categories_count: 29 });
  // Validate BetterAuth session
  const { getAuth } = await import('@/lib/auth');
  const auth = await getAuth();
  const authSession = await auth.api.getSession({ headers: req.headers });
  if (!authSession?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionKey } = await req.json();

  const mychartRequest = getSession(sessionKey);
  if (!mychartRequest) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};

  // Run all scrapers — each wrapped in try/catch so failures don't block others
  const scrapers = [
    ['profile', () => getMyChartProfile(mychartRequest)],
    ['email', () => getEmail(mychartRequest)],
    ['billing', () => getBillingHistory(mychartRequest)],
    ['upcomingVisits', () => upcomingVisits(mychartRequest)],
    ['pastVisits', () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      return pastVisits(mychartRequest, twoYearsAgo);
    }],
    ['labResults', () => listLabResults(mychartRequest)],
    ['messages', () => listConversationsWithFullHistory(mychartRequest)],
    ['medications', () => getMedications(mychartRequest)],
    ['allergies', () => getAllergies(mychartRequest)],
    ['immunizations', () => getImmunizations(mychartRequest)],
    ['insurance', () => getInsurance(mychartRequest)],
    ['careTeam', () => getCareTeam(mychartRequest)],
    ['referrals', () => getReferrals(mychartRequest)],
    ['healthSummary', () => getHealthSummary(mychartRequest)],
    ['letters', () => getLetters(mychartRequest)],
    ['healthIssues', () => getHealthIssues(mychartRequest)],
    ['preventiveCare', () => getPreventiveCare(mychartRequest)],
    ['medicalHistory', () => getMedicalHistory(mychartRequest)],
    ['vitals', () => getVitals(mychartRequest)],
    ['emergencyContacts', () => getEmergencyContacts(mychartRequest)],
    ['documents', () => getDocuments(mychartRequest)],
    ['goals', () => getGoals(mychartRequest)],
    ['upcomingOrders', () => getUpcomingOrders(mychartRequest)],
    ['questionnaires', () => getQuestionnaires(mychartRequest)],
    ['careJourneys', () => getCareJourneys(mychartRequest)],
    ['activityFeed', () => getActivityFeed(mychartRequest)],
    ['educationMaterials', () => getEducationMaterials(mychartRequest)],
    ['ehiExport', () => getEhiExportTemplates(mychartRequest)],
    ['imagingResults', () => getImagingResults(mychartRequest)],
    ['linkedMyChartAccounts', () => getLinkedMyChartAccounts(mychartRequest)],
  ] as const;

  await Promise.allSettled(
    scrapers.map(async ([key, fn]) => {
      try {
        data[key] = await fn();
      } catch (err) {
        data[key] = key === 'email' ? null : { error: (err as Error).message };
      }
    })
  );


  // Normalize visit data — different MyChart instances return different field names
  if (data.upcomingVisits && !data.upcomingVisits.error) {
    data.upcomingVisits = normalizeUpcomingVisits(data.upcomingVisits);
  }
  if (data.pastVisits && !data.pastVisits.error) {
    data.pastVisits = normalizePastVisits(data.pastVisits);
  }

  // Don't delete session here — user may still need it for MCP URL generation
  // Sessions will expire naturally from the in-memory store

  return NextResponse.json(data);
}
