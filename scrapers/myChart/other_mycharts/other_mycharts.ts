import { MyChartRequest } from "../myChartRequest";
import { getRequestVerificationTokenFromBody } from "../util";
import { logger } from '../../../shared/logger';

export interface LinkedMyChart {
  name: string;
  logoUrl: string;
  lastEncounter: string | null;
}

interface OrgListResponse {
  OrgList: Record<string, { OrganizationName: string; LogoUrl: string; LastEncounterDetail: string | null }>;
}

export async function getLinkedMyChartAccounts(mychartRequest: MyChartRequest): Promise<LinkedMyChart[]> {

  const res = await mychartRequest.makeRequest({ path: '/Community/Manage' })

  const html = await res.text()

  const requestVerificationToken = getRequestVerificationTokenFromBody(html)

  if (!requestVerificationToken) {
    logger.debug('could not find request verification token')
    return [];
  }

  const res2 = await mychartRequest.makeRequest({
    path: `/Community/Shared/LoadCommunityLinks?noCache=` + Math.random(),
    "headers": {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      __requestverificationtoken: requestVerificationToken
    },
    "body": 'controllerType=2&showDXROrgInMO=false',
    "method": "POST",
  });

  const json = await res2.json() as OrgListResponse;

  const ret: LinkedMyChart[] = []

  for (const result of Object.values(json.OrgList)) {

    ret.push({
      name: result.OrganizationName,
      logoUrl: result.LogoUrl,
      lastEncounter: result.LastEncounterDetail,
    })
  }

  return ret;
}
