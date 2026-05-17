/**
 * Phase 3: Deep dive into SendReply endpoint and lazy-loaded JS chunks.
 * We found /api/conversations/SendReply returns 200.
 * Now figure out the request body format and find compose/new-message endpoints.
 */

import { getRequestVerificationTokenFromBody } from '../util';
import { MyChartRequest } from '../myChartRequest';
import fs from 'fs';
import { logger } from '../../../shared/logger';

async function explore3() {
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
  if (testRes.status !== 200) {
    logger.debug('Cookies expired!');
    process.exit(1);
  }
  logger.debug('Cookies valid!\n');

  // Get token
  const commRes = await mychartRequest.makeRequest({ path: '/app/communication-center' });
  const commHtml = await commRes.text();
  const token = getRequestVerificationTokenFromBody(commHtml)!;

  // Step 1: Find lazy-loaded JS chunks in the communication-center HTML
  logger.debug('=== Looking for lazy-loaded React chunks ===\n');

  // React SPAs typically have a __INITIAL_STATE__ or similar embedded config
  // Look for any JSON config embedded in the page
  const stateMatch = commHtml.match(/__INITIAL_STATE__\s*=\s*({[\s\S]*?})(?:\s*;|\s*<)/);
  if (stateMatch) {
    logger.debug('Found __INITIAL_STATE__:', stateMatch[1].substring(0, 500));
  }

  // Look for any webpack chunk loading patterns
  const chunkMatches = commHtml.match(/(?:chunk|lazy|module)[^"']*\.js/gi) || [];
  logger.debug('Chunk patterns:', chunkMatches);

  // Look for embedded JSON/config that might have API routes
  const configMatches = commHtml.match(/window\.\w+\s*=\s*{[\s\S]*?}/g) || [];
  for (const config of configMatches.slice(0, 5)) {
    logger.debug('\nWindow config:', config.substring(0, 300));
  }

  // Step 2: Look at the mychart-web-server JS more carefully for API patterns
  logger.debug('\n=== Searching mychart-web-server.js for conversation/message patterns ===\n');
  const webServerRes = await mychartRequest.makeRequest({ path: '/scripts/lib/pxbuild/epic.px.client.mychart-web-server.js' });
  const webServerJs = await webServerRes.text();

  // Search for conversation-related patterns
  const convoPatterns = [
    /[a-zA-Z_$]+(?:Conversation|Message|Reply|Compose|Send|Recipient|communication)[a-zA-Z_$]*/gi,
    /"[^"]*(?:conversation|message|reply|compose|send|recipient|communication)[^"]*"/gi,
    /\/[a-zA-Z-]+\/(?:GetConversation|SendReply|GetRecipient|Compose|NewMessage|AskQuestion)[a-zA-Z]*/gi,
  ];

  const foundPatterns = new Set<string>();
  for (const pattern of convoPatterns) {
    const matches = webServerJs.match(pattern) || [];
    for (const m of matches) {
      foundPatterns.add(m);
    }
  }
  const sorted = [...foundPatterns].sort();
  logger.debug(`Found ${sorted.length} conversation/messaging patterns:`);
  for (const p of sorted) {
    logger.debug(`  ${p}`);
  }

  // Step 3: Search ALL JS files for the SendReply body format
  logger.debug('\n=== Searching for SendReply body format ===\n');

  // Find context around "SendReply" in the JS
  const sendReplyIndex = webServerJs.indexOf('SendReply');
  if (sendReplyIndex !== -1) {
    const context = webServerJs.substring(Math.max(0, sendReplyIndex - 200), sendReplyIndex + 300);
    logger.debug('SendReply context in mychart-web-server.js:');
    logger.debug(context);
  }

  // Also search SDK
  const sdkRes = await mychartRequest.makeRequest({ path: '/scripts/lib/pxbuild/epic.px.client.sdk.js' });
  const sdkJs = await sdkRes.text();
  const sdkSendReplyIndex = sdkJs.indexOf('SendReply');
  if (sdkSendReplyIndex !== -1) {
    const context = sdkJs.substring(Math.max(0, sdkSendReplyIndex - 200), sdkSendReplyIndex + 300);
    logger.debug('\nSendReply context in sdk.js:');
    logger.debug(context);
  }

  // Search through all the core bundles
  const coreRes = await mychartRequest.makeRequest({ path: '/bundles/core-1-post' });
  const coreJs = await coreRes.text();
  let srIdx = coreJs.indexOf('SendReply');
  if (srIdx !== -1) {
    logger.debug('\nSendReply in core-1-post:', coreJs.substring(Math.max(0, srIdx - 200), srIdx + 300));
  }

  for (const bundlePath of ['/bundles/core-2-en-US', '/bundles/core-3-en-US', '/bundles/core-4-header', '/bundles/core-5-en-US']) {
    const res = await mychartRequest.makeRequest({ path: bundlePath });
    const js = await res.text();
    srIdx = js.indexOf('SendReply');
    if (srIdx !== -1) {
      logger.debug(`\nSendReply in ${bundlePath}:`, js.substring(Math.max(0, srIdx - 300), srIdx + 400));
    }

    // Also look for "conversations" API patterns
    const convIdx = js.indexOf('conversations/');
    if (convIdx !== -1) {
      logger.debug(`\n"conversations/" in ${bundlePath}:`, js.substring(Math.max(0, convIdx - 100), convIdx + 200));
    }
  }

  // Step 4: Get conversation details to understand reply structure
  logger.debug('\n=== Getting conversation details ===\n');

  // First get conversations list
  const convoListRes = await mychartRequest.makeRequest({
    path: '/api/conversations/GetConversationList',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({ tag: 1, localLoadParams: { loadStartInstantISO: '', loadEndInstantISO: '', pagingInfo: 1 }, externalLoadParams: {}, searchQuery: '', PageNonce: '' }),
  });
  const convoList = await convoListRes.json();

  // Get a conversation that's from a provider (not bulk) - one we could reply to
  const conversations = convoList.conversations || [];
  logger.debug(`Total conversations: ${conversations.length}`);

  for (const convo of conversations.slice(0, 5)) {
    logger.debug(`\n  Subject: ${convo.subject}`);
    logger.debug(`  hthId: ${convo.hthId}`);
    logger.debug(`  messageType: ${convo.messageType}`);
    logger.debug(`  userKeys: ${JSON.stringify(convo.userKeys)}`);
    logger.debug(`  viewerKeys: ${JSON.stringify(convo.viewerKeys)}`);
    logger.debug(`  audience: ${JSON.stringify(convo.audience)}`);

    // Try getting full details
    const detailRes = await mychartRequest.makeRequest({
      path: '/api/conversations/GetConversationDetails',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        '__RequestVerificationToken': token,
      },
      body: JSON.stringify({ hthId: convo.hthId }),
    });
    const detailText = await detailRes.text();
    logger.debug(`  Detail status: ${detailRes.status}, length: ${detailText.length}`);
    if (detailRes.status === 200 && detailText.length > 10) {
      const detail = JSON.parse(detailText);
      logger.debug(`  Detail keys: ${Object.keys(detail).join(', ')}`);
      // Save the first one
      await fs.promises.writeFile('/tmp/mychart_convo_detail_full.json', JSON.stringify(detail, null, 2));
      logger.debug('  Saved to /tmp/mychart_convo_detail_full.json');
      break;
    }
  }

  // Step 5: Try to find the new message form
  logger.debug('\n=== Trying "Ask a Question" related endpoints ===\n');

  // Visit the ask question page with an AJAX-like request
  const askRes = await mychartRequest.makeRequest({
    path: '/app/communication-center/ask-question',
  });
  const askHtml = await askRes.text();

  // Look for any embedded state or API config in the ask question page specifically
  // Search for any different script tags
  const askScripts = [...askHtml.matchAll(/src="([^"]+)"/g)].map(m => m[1]);
  const commScripts = [...commHtml.matchAll(/src="([^"]+)"/g)].map(m => m[1]);
  const askOnlyScripts = askScripts.filter(s => !commScripts.includes(s));
  if (askOnlyScripts.length > 0) {
    logger.debug('Scripts unique to ask-question page:');
    for (const s of askOnlyScripts) {
      logger.debug(`  ${s}`);
    }
  } else {
    logger.debug('Ask-question page uses same scripts as communication-center (SPA)');
  }

  // Step 6: Try more endpoint variations for creating new messages
  logger.debug('\n=== Trying more new-message endpoints ===\n');

  const newMsgEndpoints = [
    // PX framework patterns
    '/api/px/conversations/SendReply',
    '/api/px/conversations/NewMessage',
    '/api/px/communication-center/ask-question',
    // Direct conversation creation
    '/api/conversations/CreateConversation',
    '/api/conversations/StartConversation',
    '/api/conversations/NewConversation',
    '/api/conversations/InitComposer',
    '/api/conversations/GetComposerData',
    '/api/conversations/GetAskQuestionData',
    '/api/conversations/AskQuestion',
    '/api/conversations/MedicalAdviceRequest',
    '/api/conversations/GetMessageTypes',
    '/api/conversations/GetTopics',
    // Other patterns from Epic
    '/api/epic.messaging/send',
    '/api/epic.messaging/create',
  ];

  for (const endpoint of newMsgEndpoints) {
    try {
      const res = await mychartRequest.makeRequest({
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          '__RequestVerificationToken': token,
        },
        body: JSON.stringify({}),
      });
      const text = await res.text();
      if (res.status !== 404) {
        logger.debug(`  ${endpoint} -> ${res.status} (${text.length}): ${text.substring(0, 200)}`);
      }
    } catch (err) {
      logger.debug(`  ${endpoint} -> Error: ${(err as Error).message}`);
    }
  }

  logger.debug('\n=== Done ===');
}

explore3().catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
