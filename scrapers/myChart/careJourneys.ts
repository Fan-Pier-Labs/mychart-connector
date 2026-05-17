import { MyChartRequest } from "./myChartRequest";
import { getRequestVerificationTokenFromBody } from "./util";
import { logger } from '../../shared/logger';

export type CareJourney = {
  id: string;
  name: string;
  description: string;
  status: string;
  providerName: string;
}

type CareJourneyResponse = {
  id?: string;
  name?: string;
  description?: string;
  status?: string;
  providerName?: string;
}

type GetCareJourneysResponse = {
  careJourneys?: CareJourneyResponse[];
}

export async function getCareJourneys(mychartRequest: MyChartRequest): Promise<CareJourney[]> {
  const pageResp = await mychartRequest.makeRequest({ path: '/app/care-journeys' });
  const html = await pageResp.text();
  const token = getRequestVerificationTokenFromBody(html);

  if (!token) {
    logger.debug('Could not find request verification token for care journeys');
    return [];
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/care-journeys/GetCareJourneys',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({}),
  });

  const json: GetCareJourneysResponse = await resp.json();

  return (json.careJourneys || []).map((cj: CareJourneyResponse) => ({
    id: cj.id || '',
    name: cj.name || '',
    description: cj.description || '',
    status: cj.status || '',
    providerName: cj.providerName || '',
  }));
}
