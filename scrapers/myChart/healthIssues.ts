import { MyChartRequest } from "./myChartRequest";
import { getRequestVerificationTokenFromBody } from "./util";
import { logger } from '../../shared/logger';

export type HealthIssue = {
  name: string;
  id: string;
  formattedDateNoted: string;
  isReadOnly: boolean;
}

type HealthIssueItemResponse = {
  name?: string;
  id?: string;
  formattedDateNoted?: string;
  isReadOnly?: boolean;
}

type HealthIssueDataListEntry = {
  healthIssueItem?: HealthIssueItemResponse;
}

type LoadHealthIssuesResponse = {
  dataList?: HealthIssueDataListEntry[];
}

export async function getHealthIssues(mychartRequest: MyChartRequest): Promise<HealthIssue[]> {
  const pageResp = await mychartRequest.makeRequest({ path: '/Clinical/HealthIssues' });
  const html = await pageResp.text();
  const token = getRequestVerificationTokenFromBody(html);

  if (!token) {
    logger.debug('Could not find request verification token for health issues');
    return [];
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/HealthIssues/LoadHealthIssuesData',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({}),
  });

  const json: LoadHealthIssuesResponse = await resp.json();

  return (json.dataList || []).map((item: HealthIssueDataListEntry) => ({
    name: item.healthIssueItem?.name || '',
    id: item.healthIssueItem?.id || '',
    formattedDateNoted: item.healthIssueItem?.formattedDateNoted || '',
    isReadOnly: item.healthIssueItem?.isReadOnly || false,
  }));
}
