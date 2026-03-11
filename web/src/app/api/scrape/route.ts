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


  // Don't delete session here — user may still need it for MCP URL generation
  // Sessions will expire naturally from the in-memory store



  return NextResponse.json(data);
}
