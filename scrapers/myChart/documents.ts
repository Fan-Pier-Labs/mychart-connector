import { MyChartRequest } from "./myChartRequest";
import { getRequestVerificationTokenFromBody } from "./util";
import { logger } from '../../shared/logger';

export type Document = {
  id: string;
  title: string;
  documentType: string;
  date: string;
  providerName: string;
  organizationName: string;
};

type DocumentResponse = {
  id?: string;
  title?: string;
  documentType?: string;
  date?: string;
  providerName?: string;
  organizationName?: string;
};

type LoadDocumentsResponse = {
  documents?: DocumentResponse[];
};

export async function getDocuments(mychartRequest: MyChartRequest): Promise<Document[]> {
  const pageResp = await mychartRequest.makeRequest({ path: '/app/documents' });
  const html = await pageResp.text();
  const token = getRequestVerificationTokenFromBody(html);

  if (!token) {
    logger.debug('Could not find request verification token for documents');
    return [];
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/documents/viewer/LoadOtherDocuments',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({}),
  });

  const json: LoadDocumentsResponse = await resp.json();

  return (json.documents || []).map((doc: DocumentResponse) => ({
    id: doc.id || '',
    title: doc.title || '',
    documentType: doc.documentType || '',
    date: doc.date || '',
    providerName: doc.providerName || '',
    organizationName: doc.organizationName || '',
  }));
}
