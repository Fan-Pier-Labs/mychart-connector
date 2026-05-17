import { MyChartRequest } from '../myChartRequest';
import { getRequestVerificationTokenFromBody } from '../util';
import { logger } from '../../../shared/logger';

export type DraftResult = {
  success: boolean;
  error?: string;
}

async function getToken(mychartRequest: MyChartRequest): Promise<string | undefined> {
  const pageResp = await mychartRequest.makeRequest({ path: '/app/communication-center' });
  const html = await pageResp.text();
  return getRequestVerificationTokenFromBody(html);
}

export async function saveReplyDraft(
  mychartRequest: MyChartRequest,
  conversationId: string,
  messageBody: string,
): Promise<DraftResult> {
  const token = await getToken(mychartRequest);
  if (!token) {
    logger.debug('Could not find request verification token for save draft');
    return { success: false, error: 'Could not get verification token' };
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/conversations/SaveReplyDraft',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({ conversationId, messageBody: [messageBody] }),
  });

  if (resp.status === 200) return { success: true };
  const text = await resp.text();
  return { success: false, error: `Save draft failed with status ${resp.status}: ${text}` };
}

export async function saveNewMessageDraft(
  mychartRequest: MyChartRequest,
  messageBody: string,
  subject: string,
): Promise<DraftResult> {
  const token = await getToken(mychartRequest);
  if (!token) {
    logger.debug('Could not find request verification token for save draft');
    return { success: false, error: 'Could not get verification token' };
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/medicaladvicerequests/SaveMedicalAdviceRequestDraft',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({ messageBody: [messageBody], messageSubject: subject }),
  });

  if (resp.status === 200) return { success: true };
  const text = await resp.text();
  return { success: false, error: `Save draft failed with status ${resp.status}: ${text}` };
}

export async function deleteDraft(
  mychartRequest: MyChartRequest,
  conversationId: string,
): Promise<DraftResult> {
  const token = await getToken(mychartRequest);
  if (!token) {
    logger.debug('Could not find request verification token for delete draft');
    return { success: false, error: 'Could not get verification token' };
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/conversations/DeleteDraft',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({ conversationId }),
  });

  if (resp.status === 200) return { success: true };
  const text = await resp.text();
  return { success: false, error: `Delete draft failed with status ${resp.status}: ${text}` };
}
