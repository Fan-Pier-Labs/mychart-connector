import { MyChartRequest } from "./myChartRequest";
import { getRequestVerificationTokenFromBody } from "./util";
import { logger } from '../../shared/logger';

export type EhiTemplate = {
  id: string;
  name: string;
  description: string;
  format: string;
}

type EhiTemplateResponse = {
  id?: string;
  name?: string;
  description?: string;
  format?: string;
}

type GetEhiTemplatesResponse = {
  templates?: EhiTemplateResponse[];
}

export async function getEhiExportTemplates(mychartRequest: MyChartRequest): Promise<EhiTemplate[]> {
  const pageResp = await mychartRequest.makeRequest({ path: '/app/release-of-information' });
  const html = await pageResp.text();
  const token = getRequestVerificationTokenFromBody(html);

  if (!token) {
    logger.debug('Could not find request verification token for EHI export');
    return [];
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/release-of-information/GetEHIETemplates',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({}),
  });

  const json: GetEhiTemplatesResponse = await resp.json();

  return (json.templates || []).map((t: EhiTemplateResponse) => ({
    id: t.id || '',
    name: t.name || '',
    description: t.description || '',
    format: t.format || '',
  }));
}
