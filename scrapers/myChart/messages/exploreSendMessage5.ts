/**
 * Phase 5: Test the actual API endpoints with correct body format.
 * We know:
 * - SendReply needs: {conversationId, organizationId, viewers, messageBody, messageSubject, documentIds, includeOtherViewers, composeId}
 * - GetComposeId returns a compose ID
 * - GetComposeSettings needs {organizationId}
 * - GetConversationDetails needs {hthId} and returns conversation + reply info
 * - GetMessageMenuSettings returns the message menu (for new messages)
 */

import { getRequestVerificationTokenFromBody } from '../util';
import { MyChartRequest } from '../myChartRequest';
import fs from 'fs';
import { logger } from '../../../shared/logger';

async function explore5() {
  const hostname = 'mychart.example.org';

  const mychartRequest = new MyChartRequest(hostname);
  const pathResponse = await mychartRequest.makeRequest({ followRedirects: false, url: 'https://' + hostname });
  const locationHeader = pathResponse.headers.get('Location');
  if (locationHeader) {
    const url = new URL(locationHeader, 'https://' + hostname);
    mychartRequest.setFirstPathPart(url.pathname.split('/')[1]);
  }
  await mychartRequest.loadCookies_TEST('/tmp/mychart_explore_cookies.json');

  const testRes = await mychartRequest.makeRequest({ path: '/Home', followRedirects: false });
  if (testRes.status !== 200) { logger.debug('Cookies expired!'); process.exit(1); }
  logger.debug('Cookies valid!\n');

  // Get token from communication center
  const commRes = await mychartRequest.makeRequest({ path: '/app/communication-center' });
  const commHtml = await commRes.text();
  const token = getRequestVerificationTokenFromBody(commHtml)!;

  const makeApiRequest = async (path: string, body: unknown) => {
    const res = await mychartRequest.makeRequest({
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        '__RequestVerificationToken': token,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, text, json: text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null };
  };

  // Step 1: GetMessageMenuSettings - understand what message types we can send
  logger.debug('=== GetMessageMenuSettings ===\n');
  const menuSettings = await makeApiRequest('/api/conversations/GetMessageMenuSettings', {});
  logger.debug('Status:', menuSettings.status);
  logger.debug('Response:', JSON.stringify(menuSettings.json, null, 2)?.substring(0, 2000));
  if (menuSettings.json) {
    await fs.promises.writeFile('/tmp/mychart_message_menu_settings.json', JSON.stringify(menuSettings.json, null, 2));
  }

  // Step 2: GetComposeId - get a compose ID
  logger.debug('\n=== GetComposeId ===\n');
  const composeId = await makeApiRequest('/api/conversations/GetComposeId', {});
  logger.debug('Status:', composeId.status);
  logger.debug('Response:', composeId.text?.substring(0, 500));

  // Step 3: GetComposeSettings - get compose settings (try with empty org first)
  logger.debug('\n=== GetComposeSettings ===\n');
  const composeSettingsEmpty = await makeApiRequest('/api/conversations/GetComposeSettings', { organizationId: '' });
  logger.debug('Empty org status:', composeSettingsEmpty.status);
  logger.debug('Response:', JSON.stringify(composeSettingsEmpty.json, null, 2)?.substring(0, 1000));

  // Step 4: GetOrganizations
  logger.debug('\n=== GetOrganizations ===\n');
  const orgs = await makeApiRequest('/api/conversations/GetOrganizations', {});
  logger.debug('Status:', orgs.status);
  logger.debug('Response:', JSON.stringify(orgs.json, null, 2)?.substring(0, 1000));

  // Step 5: GetFoldersList
  logger.debug('\n=== GetFoldersList ===\n');
  const folders = await makeApiRequest('/api/conversations/GetFoldersList', {});
  logger.debug('Status:', folders.status);
  logger.debug('Response:', JSON.stringify(folders.json, null, 2)?.substring(0, 500));

  // Step 6: GetConversationDetails - get details of a conversation we can reply to
  logger.debug('\n=== GetConversationDetails ===\n');

  // First get conversation list
  const convoList = await makeApiRequest('/api/conversations/GetConversationList', {
    tag: 1,
    localLoadParams: { loadStartInstantISO: '', loadEndInstantISO: '', pagingInfo: 1 },
    externalLoadParams: {},
    searchQuery: '',
    PageNonce: '',
  });

  const conversations = convoList.json?.conversations || [];
  logger.debug(`Total conversations: ${conversations.length}`);

  // Find the "Cough" conversation which has a provider audience
  const targetConvo = conversations.find((c: { audience: unknown[]; subject: string }) =>
    c.audience && c.audience.length > 0
  );

  if (targetConvo) {
    logger.debug(`\nTarget conversation: "${targetConvo.subject}"`);
    logger.debug('hthId:', targetConvo.hthId);
    logger.debug('messageType:', targetConvo.messageType);
    logger.debug('audience:', JSON.stringify(targetConvo.audience));

    // Try GetConversationDetails
    const detail = await makeApiRequest('/api/conversations/GetConversationDetails', {
      hthId: targetConvo.hthId,
    });
    logger.debug('\nDetail status:', detail.status, 'length:', detail.text?.length);
    logger.debug('Detail response:', detail.text?.substring(0, 200));

    // Try GetConversationMessages
    logger.debug('\n=== GetConversationMessages ===');
    const messages = await makeApiRequest('/api/conversations/GetConversationMessages', {
      hthId: targetConvo.hthId,
    });
    logger.debug('Messages status:', messages.status, 'length:', messages.text?.length);
    if (messages.json) {
      logger.debug('Messages response:', JSON.stringify(messages.json, null, 2)?.substring(0, 2000));
      await fs.promises.writeFile('/tmp/mychart_convo_messages.json', JSON.stringify(messages.json, null, 2));
    }

    // Step 7: Now try SendReply with the correct body format
    logger.debug('\n=== Testing SendReply (dry run - won\'t actually send yet) ===\n');

    // Get a composeId first
    const cid = await makeApiRequest('/api/conversations/GetComposeId', {});
    logger.debug('Compose ID:', cid.text);

    // For now, just log what we'd send - don't actually send yet
    logger.debug('\nSendReply body format would be:');
    const sendReplyBody = {
      conversationId: targetConvo.hthId,
      organizationId: '',
      viewers: [],
      messageBody: 'i have a questiion when is the availability to book a new appointment',
      messageSubject: '',
      documentIds: [],
      includeOtherViewers: false,
      composeId: cid.text?.replace(/"/g, '') || '',
    };
    logger.debug(JSON.stringify(sendReplyBody, null, 2));
  }

  // Step 8: Explore the disclaimer endpoint
  logger.debug('\n=== GetDisclaimer ===\n');
  const disclaimer = await makeApiRequest('/api/conversations/GetDisclaimer', {});
  logger.debug('Status:', disclaimer.status);
  logger.debug('Response:', disclaimer.text?.substring(0, 500));

  logger.debug('\n=== Done ===');
}

explore5().catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
