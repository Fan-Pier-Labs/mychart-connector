/**
 * Phase 4: Fetch the lazy-loaded PX modules to find exact API endpoints.
 * Key modules: message-composer, new-message-drawer, communication-center, conversations
 */

import { getRequestVerificationTokenFromBody } from '../util';
import { MyChartRequest } from '../myChartRequest';
import fs from 'fs';
import { logger } from '../../../shared/logger';

async function explore4() {
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

  // Get token
  const commRes = await mychartRequest.makeRequest({ path: '/app/communication-center' });
  const commHtml = await commRes.text();
  const token = getRequestVerificationTokenFromBody(commHtml)!;

  // Step 1: Fetch the lazy-loaded PX client modules
  logger.debug('=== Fetching PX client modules ===\n');

  const modules = [
    'epic.px.client.communication-center',
    'epic.px.client.message-composer',
    'epic.px.client.new-message-drawer',
    'epic.px.client.conversations',
  ];

  for (const mod of modules) {
    logger.debug(`\n--- ${mod} ---`);
    const res = await mychartRequest.makeRequest({ path: `/scripts/lib/pxbuild/${mod}.js` });
    const js = await res.text();
    logger.debug(`Status: ${res.status}, Size: ${js.length}`);

    if (res.status === 200 && js.length > 100) {
      await fs.promises.writeFile(`/tmp/mychart_${mod.replace(/\./g, '_')}.js`, js);

      // Search for API endpoint patterns
      const apiPatterns = [
        ...js.matchAll(/["'](?:\/api\/[^"']+)["']/g),
        ...js.matchAll(/["'](?:api\/[^"']+)["']/g),
        ...js.matchAll(/(?:url|path|endpoint|apiUrl|apiPath)\s*[:=]\s*["']([^"']+)["']/gi),
        ...js.matchAll(/fetch\(["']([^"']+)["']/g),
        ...js.matchAll(/\.post\(["']([^"']+)["']/g),
        ...js.matchAll(/\.get\(["']([^"']+)["']/g),
      ];

      const uniqueApis = [...new Set(apiPatterns.map(m => m[0]))];
      if (uniqueApis.length > 0) {
        logger.debug(`API patterns found:`);
        for (const api of uniqueApis) {
          logger.debug(`  ${api}`);
        }
      }

      // Search for any URL-like patterns with 'conversation' or 'message'
      const urlPatterns = [
        ...js.matchAll(/["'][^"']*(?:conversation|message|compose|reply|send|recipient|recipient|ask|advice)[^"']*["']/gi),
      ];
      const filteredUrls = [...new Set(urlPatterns.map(m => m[0]))]
        .filter(u => u.length < 100 && (u.includes('/') || u.includes('api') || u.includes('Api')));
      if (filteredUrls.length > 0) {
        logger.debug(`URL-like patterns:`);
        for (const u of filteredUrls) {
          logger.debug(`  ${u}`);
        }
      }

      // Look for function names that suggest sending
      const funcPatterns = js.match(/(?:function|const|let|var)\s+([a-zA-Z_$]+(?:send|reply|compose|create|post)[a-zA-Z_$]*)/gi) || [];
      if (funcPatterns.length > 0) {
        logger.debug(`Send-related functions:`);
        for (const f of [...new Set(funcPatterns)]) {
          logger.debug(`  ${f}`);
        }
      }
    }
  }

  // Step 2: Also try the init files which may have more config
  logger.debug('\n=== Fetching PX init modules ===\n');

  for (const mod of modules) {
    const res = await mychartRequest.makeRequest({ path: `/scripts/lib/pxbuild/${mod}.init.js` });
    const js = await res.text();
    if (res.status === 200 && js.length > 50) {
      logger.debug(`${mod}.init: ${js.length} chars`);
      await fs.promises.writeFile(`/tmp/mychart_${mod.replace(/\./g, '_')}_init.js`, js);

      // Look for API patterns
      const apis = [...js.matchAll(/["'][^"']*(?:api|Api)[^"']*["']/g)].map(m => m[0]);
      if (apis.length > 0) {
        logger.debug(`  APIs:`);
        for (const a of [...new Set(apis)]) {
          logger.debug(`    ${a}`);
        }
      }
    }
  }

  // Step 3: Try the SendReply endpoint with various body formats
  logger.debug('\n=== Testing SendReply with various body formats ===\n');

  // Get a conversation we can try replying to
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
  const conversations = convoList.conversations || [];

  // Find the "Cough (allergies ?)" conversation which has audience info (provider)
  const targetConvo = conversations.find((c: { audience: unknown[] }) => c.audience && c.audience.length > 0);

  if (targetConvo) {
    logger.debug(`Using conversation: ${targetConvo.subject}`);
    logger.debug(`hthId: ${targetConvo.hthId}`);
    logger.debug(`audience:`, JSON.stringify(targetConvo.audience));

    // Try different body formats for SendReply
    const bodyFormats = [
      { hthId: targetConvo.hthId, body: "test" },
      { conversationId: targetConvo.hthId, body: "test" },
      { hthId: targetConvo.hthId, message: "test" },
      { hthId: targetConvo.hthId, messageBody: "test" },
      { hthId: targetConvo.hthId, replyBody: "test" },
      { hthId: targetConvo.hthId, text: "test" },
      { hthId: targetConvo.hthId, content: "test" },
    ];

    for (const body of bodyFormats) {
      logger.debug(`\nTrying body: ${JSON.stringify(body).substring(0, 100)}...`);
      const res = await mychartRequest.makeRequest({
        path: '/api/conversations/SendReply',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          '__RequestVerificationToken': token,
        },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      logger.debug(`  Status: ${res.status}, Response: ${text.substring(0, 500)}`);
      // If we get a meaningful response (not just {}), save it
      if (text.length > 5) {
        await fs.promises.writeFile('/tmp/mychart_sendreply_response.json', text);
        logger.debug('  Saved response!');
      }
    }
  } else {
    logger.debug('No conversation with audience found');
  }

  logger.debug('\n=== Done ===');
}

explore4().catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
