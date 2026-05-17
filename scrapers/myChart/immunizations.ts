import { MyChartRequest } from "./myChartRequest";
import { getRequestVerificationTokenFromBody } from "./util";
import { logger } from '../../shared/logger';

export type Immunization = {
  name: string;
  id: string;
  administeredDates: string[];
  organizationName: string;
}

type OrganizationResponse = {
  organizationName?: string;
}

type ImmunizationResponse = {
  name?: string;
  id?: string;
  formattedAdministeredDates?: string[];
}

type OrgImmunizationEntry = {
  organization?: OrganizationResponse;
  orgImmunizations?: ImmunizationResponse[];
}

type LoadImmunizationsResponse = {
  organizationImmunizationList?: OrgImmunizationEntry[];
}

export async function getImmunizations(mychartRequest: MyChartRequest): Promise<Immunization[]> {
  const pageResp = await mychartRequest.makeRequest({ path: '/Clinical/Immunizations' });
  const html = await pageResp.text();
  const token = getRequestVerificationTokenFromBody(html);

  if (!token) {
    logger.debug('Could not find request verification token for immunizations');
    return [];
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/immunizations/LoadImmunizations',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({}),
  });

  const json: LoadImmunizationsResponse = await resp.json();

  const immunizations: Immunization[] = [];

  for (const orgEntry of json.organizationImmunizationList || []) {
    const orgName = orgEntry.organization?.organizationName || '';
    for (const imm of orgEntry.orgImmunizations || []) {
      immunizations.push({
        name: imm.name || '',
        id: imm.id || '',
        administeredDates: imm.formattedAdministeredDates || [],
        organizationName: orgName,
      });
    }
  }

  return immunizations;
}
