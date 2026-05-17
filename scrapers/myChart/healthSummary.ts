import { MyChartRequest } from "./myChartRequest";
import { getRequestVerificationTokenFromBody } from "./util";
import { logger } from '../../shared/logger';

export type HealthSummary = {
  patientAge: string;
  height: { value: string; dateRecorded: string } | null;
  weight: { value: string; dateRecorded: string } | null;
  bloodType: string;
  patientFirstName: string;
  lastVisit: {
    date: string;
    visitType: string;
  } | null;
}

type VitalMeasurement = {
  value?: string;
  dateRecorded?: string;
}

type FetchHealthSummaryResponse = {
  header?: {
    patientAge?: string;
    height?: VitalMeasurement;
    weight?: VitalMeasurement;
    bloodType?: string;
  };
  patientFirstName?: string;
}

type FetchH2GHeaderResponse = {
  lastVisit?: {
    date?: string;
    visitType?: string;
  };
}

export async function getHealthSummary(mychartRequest: MyChartRequest): Promise<HealthSummary> {
  const pageResp = await mychartRequest.makeRequest({ path: '/app/health-summary' });
  const html = await pageResp.text();
  const token = getRequestVerificationTokenFromBody(html);

  if (!token) {
    logger.debug('Could not find request verification token for health summary');
    return { patientAge: '', height: null, weight: null, bloodType: '', patientFirstName: '', lastVisit: null };
  }

  const [summaryResp, headerResp] = await Promise.all([
    mychartRequest.makeRequest({
      path: '/api/health-summary/FetchHealthSummary',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        '__RequestVerificationToken': token,
      },
      body: JSON.stringify({}),
    }),
    mychartRequest.makeRequest({
      path: '/api/health-summary/FetchH2GHeader',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        '__RequestVerificationToken': token,
      },
      body: JSON.stringify({}),
    }),
  ]);

  const summary: FetchHealthSummaryResponse = await summaryResp.json();
  const headerData: FetchH2GHeaderResponse = await headerResp.json();

  return {
    patientAge: summary.header?.patientAge?.trim() || '',
    height: summary.header?.height ? {
      value: summary.header.height.value || '',
      dateRecorded: summary.header.height.dateRecorded || '',
    } : null,
    weight: summary.header?.weight ? {
      value: summary.header.weight.value || '',
      dateRecorded: summary.header.weight.dateRecorded || '',
    } : null,
    bloodType: summary.header?.bloodType || '',
    patientFirstName: summary.patientFirstName || '',
    lastVisit: headerData.lastVisit ? {
      date: headerData.lastVisit.date || '',
      visitType: headerData.lastVisit.visitType || '',
    } : null,
  };
}
