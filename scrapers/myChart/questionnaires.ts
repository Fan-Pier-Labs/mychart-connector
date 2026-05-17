import { MyChartRequest } from "./myChartRequest";
import { getRequestVerificationTokenFromBody } from "./util";
import { logger } from '../../shared/logger';

export type Questionnaire = {
  id: string;
  name: string;
  status: string;
  dueDate: string;
  completedDate: string;
}

type QuestionnaireResponse = {
  id?: string;
  name?: string;
  status?: string;
  dueDate?: string;
  completedDate?: string;
}

type GetQuestionnaireListResponse = {
  questionnaires?: QuestionnaireResponse[];
}

export async function getQuestionnaires(mychartRequest: MyChartRequest): Promise<Questionnaire[]> {
  const pageResp = await mychartRequest.makeRequest({ path: '/Questionnaire' });
  const html = await pageResp.text();
  const token = getRequestVerificationTokenFromBody(html);

  if (!token) {
    logger.debug('Could not find request verification token for questionnaires');
    return [];
  }

  const resp = await mychartRequest.makeRequest({
    path: '/Questionnaire/GetQuestionnaireList',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({}),
  });

  const json: GetQuestionnaireListResponse = await resp.json();

  return (json.questionnaires || []).map((q: QuestionnaireResponse) => ({
    id: q.id || '',
    name: q.name || '',
    status: q.status || '',
    dueDate: q.dueDate || '',
    completedDate: q.completedDate || '',
  }));
}
