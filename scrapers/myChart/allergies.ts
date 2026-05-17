import { MyChartRequest } from "./myChartRequest";
import { getRequestVerificationTokenFromBody } from "./util";
import { logger } from '../../shared/logger';

export type Allergy = {
  name: string;
  id: string;
  formattedDateNoted: string;
  type: string;
  reaction: string;
  severity: string;
}

export type AllergiesResult = {
  allergies: Allergy[];
  allergiesStatus: number;
}

// Shapes returned by the MyChart API
type AllergyItemResponse = {
  name?: string;
  id?: string;
  formattedDateNoted?: string;
  type?: string;
  reaction?: string;
  severity?: string;
}

type AllergyDataListEntry = {
  allergyItem?: AllergyItemResponse;
  name?: string;
  id?: string;
  formattedDateNoted?: string;
  type?: string;
  reaction?: string;
  severity?: string;
}

type LoadAllergiesResponse = {
  dataList?: AllergyDataListEntry[];
  allergiesStatus?: number;
}

export async function getAllergies(mychartRequest: MyChartRequest): Promise<AllergiesResult> {
  const pageResp = await mychartRequest.makeRequest({ path: '/Clinical/Allergies' });
  const html = await pageResp.text();
  const token = getRequestVerificationTokenFromBody(html);

  if (!token) {
    logger.debug('Could not find request verification token for allergies');
    return { allergies: [], allergiesStatus: -1 };
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/allergies/LoadAllergies',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({}),
  });

  const json: LoadAllergiesResponse = await resp.json();

  const allergies: Allergy[] = (json.dataList || []).map((item: AllergyDataListEntry) => ({
    name: item.allergyItem?.name || item.name || '',
    id: item.allergyItem?.id || item.id || '',
    formattedDateNoted: item.allergyItem?.formattedDateNoted || item.formattedDateNoted || '',
    type: item.allergyItem?.type || item.type || '',
    reaction: item.allergyItem?.reaction || item.reaction || '',
    severity: item.allergyItem?.severity || item.severity || '',
  }));

  return {
    allergies,
    allergiesStatus: json.allergiesStatus ?? -1,
  };
}
