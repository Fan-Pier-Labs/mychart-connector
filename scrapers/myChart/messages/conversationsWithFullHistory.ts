import { MyChartRequest } from "../myChartRequest";
import { getRequestVerificationTokenFromBody } from "../util";
import { logger } from '../../../shared/logger';

// --- Output types ---

export type FullThreadMessage = {
  messageId: string;
  senderName: string;
  sentDate: string;
  messageBody: string;
  isFromPatient: boolean;
};

export type ConversationWithMessages = {
  conversationId: string;
  subject: string;
  senderName: string;
  lastMessageDate: string;
  preview: string;
  messages: FullThreadMessage[];
};

export type ConversationsWithFullHistory = {
  conversations: ConversationWithMessages[];
};

// --- API response types ---

type MessageAuthor = {
  empKey?: string;
  wprKey?: string;
  displayName?: string;
};

type RawInlineMessage = {
  wmgId?: string;
  author?: MessageAuthor;
  deliveryInstantISO?: string;
  body?: string;
};

type AudienceMember = {
  name?: string;
};

type RawConversation = {
  hthId?: string;
  subject?: string;
  audience?: AudienceMember[];
  previewText?: string;
  messages?: RawInlineMessage[];
  hasMoreMessages?: boolean;
  userOverrideNames?: Record<string, string>;
};

type UserEntry = {
  name?: string;
};

type ViewerEntry = {
  name?: string;
  isSelf?: boolean;
};

type ConversationListResponse = {
  conversations?: RawConversation[];
  users?: Record<string, UserEntry>;
  viewers?: Record<string, ViewerEntry>;
};

type RawThreadMessage = {
  messageId?: string;
  wmgId?: string;
  senderName?: string;
  sentDate?: string;
  deliveryInstantISO?: string;
  messageBody?: string;
  body?: string;
  isFromPatient?: boolean;
};

type ThreadResponse = {
  messages?: RawThreadMessage[];
};

/**
 * Lists all conversations and extracts the full message history from the inline
 * messages returned by GetConversationList. The API returns messages, a users map
 * (empKey -> name), and a viewers map (wprKey -> patient info) directly in the
 * conversation list response.
 *
 * For conversations with hasMoreMessages=true, fetches additional messages via
 * GetConversationMessages.
 */
export async function listConversationsWithFullHistory(
  mychartRequest: MyChartRequest
): Promise<ConversationsWithFullHistory> {
  const communicationCenterRes = await mychartRequest.makeRequest({
    path: "/app/communication-center",
  });
  const requestVerificationToken = getRequestVerificationTokenFromBody(
    await communicationCenterRes.text()
  );

  if (!requestVerificationToken) {
    logger.debug("could not find request verification token");
    return { conversations: [] };
  }

  // Fetch conversation list — the API returns inline messages + user/viewer maps
  const resp = await mychartRequest.makeRequest({
    path: "/api/conversations/GetConversationList",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      __RequestVerificationToken: requestVerificationToken,
    },
    body: JSON.stringify({
      tag: 1,
      localLoadParams: {
        loadStartInstantISO: "",
        loadEndInstantISO: "",
        pagingInfo: 1,
      },
      externalLoadParams: {},
      searchQuery: "",
      PageNonce: "",
    }),
    method: "POST",
  });

  const data = (await resp.json()) as ConversationListResponse;
  const rawConversations = data?.conversations || [];
  const usersMap = data?.users || {};
  const viewersMap = data?.viewers || {};

  // Build a set of patient viewer keys for isFromPatient detection
  const patientViewerKeys = new Set<string>();
  for (const [key, viewer] of Object.entries(viewersMap)) {
    if (viewer.isSelf) {
      patientViewerKeys.add(key);
    }
  }

  // Helper to resolve a message author's display name
  function resolveAuthorName(msg: RawInlineMessage, convo: RawConversation): string {
    const author = msg.author || {};

    // If empKey is set, look up in users map
    if (author.empKey && usersMap[author.empKey]) {
      return usersMap[author.empKey].name || "";
    }

    // If wprKey is set, check if it's the patient
    if (author.wprKey && viewersMap[author.wprKey]) {
      return viewersMap[author.wprKey].name || "";
    }

    // Check userOverrideNames on the conversation
    if (author.empKey && convo.userOverrideNames?.[author.empKey]) {
      return convo.userOverrideNames[author.empKey];
    }

    // Fallback to displayName
    return author.displayName || "";
  }

  function isMessageFromPatient(msg: RawInlineMessage): boolean {
    const author = msg.author || {};
    return !!(author.wprKey && patientViewerKeys.has(author.wprKey));
  }

  logger.debug(
    `Found ${rawConversations.length} conversations with inline messages`
  );

  const results: ConversationWithMessages[] = rawConversations.map((convo) => {
    const inlineMessages = convo.messages || [];

    const messages: FullThreadMessage[] = inlineMessages.map((msg) => ({
      messageId: msg.wmgId || "",
      senderName: resolveAuthorName(msg, convo),
      sentDate: msg.deliveryInstantISO || "",
      messageBody: msg.body || "",
      isFromPatient: isMessageFromPatient(msg),
    }));

    // Get the audience names (providers in the conversation)
    const senderName = convo.audience
      ?.map((a) => a.name)
      .join(", ") || "";

    // Get last message date from the most recent inline message
    const lastMessageDate = inlineMessages.length > 0
      ? inlineMessages[inlineMessages.length - 1].deliveryInstantISO || ""
      : "";

    return {
      conversationId: convo.hthId || "",
      subject: convo.subject || "",
      senderName,
      lastMessageDate,
      preview: (convo.previewText || "").replace(/\r\n/g, " ").trim(),
      messages,
    };
  });

  // For conversations with hasMoreMessages=true, fetch the full thread
  const conversationsNeedingMore = results.filter((_, i) =>
    rawConversations[i].hasMoreMessages
  );

  if (conversationsNeedingMore.length > 0) {
    logger.debug(
      `${conversationsNeedingMore.length} conversation(s) have more messages, fetching full threads...`
    );

    const batchSize = 5;
    const maxRetries = 3;
    for (let i = 0; i < conversationsNeedingMore.length; i += batchSize) {
      const batch = conversationsNeedingMore.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (convo) => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const threadResp = await mychartRequest.makeRequest({
                path: "/api/conversations/GetConversationMessages",
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  __RequestVerificationToken: requestVerificationToken,
                },
                body: JSON.stringify({
                  conversationId: convo.conversationId,
                  PageNonce: "",
                }),
              });

              if (threadResp.status >= 500 && attempt < maxRetries) {
                logger.debug(
                  `  Got ${threadResp.status} fetching thread for "${convo.subject}", retrying (${attempt}/${maxRetries})...`
                );
                await new Promise((r) => setTimeout(r, 1000 * attempt));
                continue;
              }

              const threadData = (await threadResp.json()) as ThreadResponse;
              if (threadData?.messages?.length) {
                convo.messages = threadData.messages.map(
                  (msg) => ({
                    messageId: msg.messageId || msg.wmgId || "",
                    senderName: msg.senderName || "",
                    sentDate: msg.sentDate || msg.deliveryInstantISO || "",
                    messageBody: msg.messageBody || msg.body || "",
                    isFromPatient: msg.isFromPatient || false,
                  })
                );
              }
              break; // Success, stop retrying
            } catch (err) {
              if (attempt < maxRetries) {
                logger.debug(
                  `  Error fetching thread for "${convo.subject}", retrying (${attempt}/${maxRetries})...`
                );
                await new Promise((r) => setTimeout(r, 1000 * attempt));
              } else {
                logger.debug(
                  `  Error fetching full thread for "${convo.subject}" after ${maxRetries} attempts: ${(err as Error).message}`
                );
              }
            }
          }
        })
      );
    }
  }

  const totalMessages = results.reduce(
    (sum, c) => sum + c.messages.length,
    0
  );
  logger.debug(
    `Fetched ${results.length} conversations with ${totalMessages} total messages`
  );

  return { conversations: results };
}
