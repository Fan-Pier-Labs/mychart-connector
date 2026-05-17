import { MyChartRequest } from "../myChartRequest";
import { getRequestVerificationTokenFromBody } from "../util";
import { logger } from '../../../shared/logger';

interface ConversationEntry {
  hthId?: string;
  subject?: string;
  previewText?: string;
  preview?: string;
  senderName?: string;
  lastMessageDateDisplay?: string;
  audience?: { name: string }[];
  messages?: {
    wmgId?: string;
    body?: string;
    deliveryInstantISO?: string;
    author?: { displayName?: string };
  }[];
}

export interface ConversationListResponse {
  conversations?: ConversationEntry[];
  threads?: ConversationEntry[];
  users?: Record<string, { name?: string }>;
  viewers?: Record<string, { name?: string; isSelf?: boolean }>;
  [key: string]: unknown;
}

export async function listConversations(mychartRequest: MyChartRequest): Promise<ConversationListResponse | null> {


  // Go to the communication center
  const communicationCenterRes = await mychartRequest.makeRequest({ path: '/app/communication-center' })
  const requestVerificationToken = getRequestVerificationTokenFromBody(await communicationCenterRes.text())

  if (!requestVerificationToken) {
    logger.debug('could not find request verification token')
    return null
  }


  const messages = await mychartRequest.makeRequest({
    path: '/api/conversations/GetConversationList',
    "headers": {
      "Content-Type": "application/json; charset=utf-8",
      '__RequestVerificationToken': requestVerificationToken,
    },
    "body": JSON.stringify({ "tag": 1, "localLoadParams": { "loadStartInstantISO": "", "loadEndInstantISO": "", "pagingInfo": 1 }, "externalLoadParams": {}, "searchQuery": "", "PageNonce": "" }),
    "method": "POST",
  });

  const out = await messages.json() as ConversationListResponse;

  logger.debug(out)

  return out;
}

