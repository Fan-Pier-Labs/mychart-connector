import { MyChartRequest } from "./myChartRequest";
import { getRequestVerificationTokenFromBody } from "./util";
import { logger } from '../../shared/logger';

export type VitalReading = {
  date: string;
  value: string;
  units: string;
};

export type Flowsheet = {
  name: string;
  flowsheetId: string;
  readings: VitalReading[];
};

type FlowsheetResponse = {
  name?: string;
  flowsheetId?: string;
  readings?: Array<{ date?: string; value?: string; units?: string }>;
};

type GetFlowsheetsResponse = {
  flowsheets?: FlowsheetResponse[];
};

export async function getVitals(mychartRequest: MyChartRequest): Promise<Flowsheet[]> {
  const pageResp = await mychartRequest.makeRequest({ path: '/app/track-my-health' });
  const html = await pageResp.text();
  const token = getRequestVerificationTokenFromBody(html);

  if (!token) {
    logger.debug('Could not find request verification token for vitals');
    return [];
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/track-my-health/GetFlowsheets',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({ organizationId: "" }),
  });

  const json: GetFlowsheetsResponse = await resp.json();

  return (json.flowsheets || []).map((fs: FlowsheetResponse) => ({
    name: fs.name || '',
    flowsheetId: fs.flowsheetId || '',
    readings: (fs.readings || []).map(r => ({
      date: r.date || '',
      value: r.value || '',
      units: r.units || '',
    })),
  }));
}
