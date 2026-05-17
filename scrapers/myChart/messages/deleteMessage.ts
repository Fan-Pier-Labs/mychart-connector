import { MyChartRequest } from '../myChartRequest';
import { getRequestVerificationTokenFromBody } from '../util';
import { logger } from '../../../shared/logger';

export type DeleteMessageResult = {
  success: boolean;
  error?: string;
}

export async function deleteMessage(mychartRequest: MyChartRequest, conversationId: string): Promise<DeleteMessageResult> {
  const pageResp = await mychartRequest.makeRequest({ path: '/app/communication-center' });
  const html = await pageResp.text();
  const token = getRequestVerificationTokenFromBody(html);

  if (!token) {
    logger.debug('Could not find request verification token for delete message');
    return { success: false, error: 'Could not get verification token' };
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/conversations/DeleteConversation',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({ conversationId }),
  });

  if (resp.status === 200) {
    return { success: true };
  }

  const text = await resp.text();
  return { success: false, error: `Delete failed with status ${resp.status}: ${text}` };
}
