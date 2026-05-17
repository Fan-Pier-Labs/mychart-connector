/**
 * Exploration script to discover MyChart's send message API endpoints.
 *
 * This script logs in and navigates to the messaging/compose pages
 * to understand the request structure needed for sending messages.
 */

import { myChartUserPassLogin, complete2faFlow } from '../login';
import { getRequestVerificationTokenFromBody } from '../util';
import { MyChartRequest } from '../myChartRequest';
import { getMyChartAccounts } from '../../../read-local-passwords/index';
import * as readline from 'readline';
import fs from 'fs';
import { logger } from '../../../shared/logger';

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function getLoggedInSession(): Promise<MyChartRequest> {
  const hostname = 'mychart.example.org';

  // Try to load saved cookies first
  const cookieFile = '/tmp/mychart_explore_cookies.json';
  const mychartRequestFromCookies = new MyChartRequest(hostname);

  // Determine first path part
  const pathResponse = await mychartRequestFromCookies.makeRequest({ followRedirects: false, url: 'https://' + hostname });
  const locationHeader = pathResponse.headers.get('Location');
  if (locationHeader) {
    const url = new URL(locationHeader, 'https://' + hostname);
    mychartRequestFromCookies.setFirstPathPart(url.pathname.split('/')[1]);
  }

  try {
    await mychartRequestFromCookies.loadCookies_TEST(cookieFile);
    // Test if cookies are still valid
    const testRes = await mychartRequestFromCookies.makeRequest({ path: '/Home', followRedirects: false });
    if (testRes.status === 200) {
      logger.debug('Reusing saved cookies - still valid!');
      return mychartRequestFromCookies;
    }
    logger.debug('Saved cookies expired, need to re-login');
  } catch {
    logger.debug('No saved cookies, need to login');
  }

  // Login fresh
  logger.debug(`Scanning browser passwords for ${hostname}...`);
  const accounts = await getMyChartAccounts();
  const match = accounts.find(a => {
    try { return new URL(a.url).hostname === hostname; } catch { return false; }
  });

  if (!match?.user || !match?.pass) {
    throw new Error('Could not find credentials');
  }

  logger.debug(`Found credentials for ${match.user}`);
  const loginResult = await myChartUserPassLogin({ hostname, user: match.user, pass: match.pass });

  let mychartRequest: MyChartRequest;

  if (loginResult.state === 'need_2fa') {
    logger.debug('\n2FA required. Check your email for the code.');
    const code = await ask('Enter 2FA code: ');
    const twoFaResult = await complete2faFlow({
      mychartRequest: loginResult.mychartRequest,
      twofaCodeArray: [{ code, score: 1 }],
    });
    if (twoFaResult.state !== 'logged_in') {
      throw new Error('2FA failed: ' + twoFaResult.state);
    }
    mychartRequest = twoFaResult.mychartRequest;
  } else if (loginResult.state === 'logged_in') {
    mychartRequest = loginResult.mychartRequest;
  } else {
    throw new Error('Login failed: ' + loginResult.state);
  }

  // Save cookies for reuse
  await mychartRequest.saveCookies_TEST(cookieFile);
  logger.debug('Saved cookies to', cookieFile);

  return mychartRequest;
}

async function explore() {
  const mychartRequest = await getLoggedInSession();
  logger.debug('\n=== Logged in successfully ===\n');

  // Step 1: Visit the communication center to get the verification token
  logger.debug('--- Fetching /app/communication-center ---');
  const commCenterRes = await mychartRequest.makeRequest({ path: '/app/communication-center' });
  const commCenterHtml = await commCenterRes.text();
  const token = getRequestVerificationTokenFromBody(commCenterHtml);
  logger.debug('Request verification token:', token ? token.substring(0, 20) + '...' : 'NOT FOUND');

  // Step 2: Explore the "Ask a Question" page
  logger.debug('\n--- Fetching /AskQuestion ---');
  const askQuestionRes = await mychartRequest.makeRequest({ path: '/AskQuestion' });
  const askQuestionHtml = await askQuestionRes.text();
  logger.debug('Ask a Question status:', askQuestionRes.status);
  logger.debug('Ask a Question HTML length:', askQuestionHtml.length);
  await fs.promises.writeFile('/tmp/mychart_ask_question.html', askQuestionHtml);
  logger.debug('Saved to /tmp/mychart_ask_question.html');

  // Step 3: Try to find the compose/new message page
  logger.debug('\n--- Fetching /app/communication-center/compose ---');
  const composeRes = await mychartRequest.makeRequest({ path: '/app/communication-center/compose' });
  const composeHtml = await composeRes.text();
  logger.debug('Compose status:', composeRes.status);
  await fs.promises.writeFile('/tmp/mychart_compose.html', composeHtml);
  logger.debug('Saved to /tmp/mychart_compose.html');

  // Step 4: Try medical advice request
  logger.debug('\n--- Fetching /MedicalAdviceRequest ---');
  const marRes = await mychartRequest.makeRequest({ path: '/MedicalAdviceRequest' });
  const marHtml = await marRes.text();
  logger.debug('MedicalAdviceRequest status:', marRes.status);
  await fs.promises.writeFile('/tmp/mychart_medical_advice.html', marHtml);
  logger.debug('Saved to /tmp/mychart_medical_advice.html');

  // Step 5: Look for API endpoints related to messaging
  logger.debug('\n--- Trying messaging API discovery ---');

  if (token) {
    const recipientEndpoints = [
      '/api/messaging/GetRecipients',
      '/api/messaging/GetAvailableRecipients',
      '/api/conversations/GetRecipients',
      '/api/askaquestion/GetRecipients',
      '/api/askaquestion/LoadAskAQuestionPage',
      '/api/medical-advice/GetRecipients',
      '/api/medical-advice/LoadPage',
      '/api/message-composer/GetRecipients',
      '/api/message-composer/LoadComposer',
      '/api/message-composer/Initialize',
      '/api/messaging/Initialize',
      '/api/messaging/LoadComposer',
      '/api/conversations/Initialize',
    ];

    for (const endpoint of recipientEndpoints) {
      try {
        logger.debug(`\nTrying POST ${endpoint}...`);
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
        logger.debug(`  Status: ${res.status}, Length: ${text.length}`);
        if (res.status === 200 && text.length > 2) {
          logger.debug(`  Response preview: ${text.substring(0, 500)}`);
          const safeEndpoint = endpoint.replace(/\//g, '_');
          await fs.promises.writeFile(`/tmp/mychart${safeEndpoint}.json`, text);
        }
      } catch (err) {
        logger.debug(`  Error: ${(err as Error).message}`);
      }
    }
  }

  // Step 6: Get conversation list to see full structure
  logger.debug('\n--- Fetching conversation list ---');
  if (token) {
    const convoRes = await mychartRequest.makeRequest({
      path: '/api/conversations/GetConversationList',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        '__RequestVerificationToken': token,
      },
      body: JSON.stringify({ tag: 1, localLoadParams: { loadStartInstantISO: '', loadEndInstantISO: '', pagingInfo: 1 }, externalLoadParams: {}, searchQuery: '', PageNonce: '' }),
      method: 'POST',
    });
    const convoJson = await convoRes.json();
    await fs.promises.writeFile('/tmp/mychart_conversations.json', JSON.stringify(convoJson, null, 2));
    logger.debug('Saved conversation list to /tmp/mychart_conversations.json');
    logger.debug('Top-level keys:', Object.keys(convoJson));

    // If there are threads, get the first one's details
    const threads = convoJson.threads || convoJson.Threads || [];
    if (threads.length > 0) {
      const firstThread = threads[0];
      logger.debug('\nFirst thread keys:', Object.keys(firstThread));
      logger.debug('First thread (truncated):', JSON.stringify(firstThread, null, 2).substring(0, 1500));

      // Try to get conversation details using various possible ID fields
      const convoId = firstThread.hthId || firstThread.id || firstThread.Id || firstThread.HthId;
      if (convoId) {
        logger.debug(`\n--- Fetching conversation details for ${convoId} ---`);

        const detailBodies = [
          { hthId: convoId },
          { id: convoId },
          { conversationId: convoId },
          { HthId: convoId },
        ];

        for (const body of detailBodies) {
          try {
            const detailRes = await mychartRequest.makeRequest({
              path: '/api/conversations/GetConversationDetails',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                '__RequestVerificationToken': token,
              },
              body: JSON.stringify(body),
            });
            const detailText = await detailRes.text();
            logger.debug(`  Body ${JSON.stringify(body)} - Status: ${detailRes.status}, Length: ${detailText.length}`);
            if (detailRes.status === 200 && detailText.length > 10) {
              await fs.promises.writeFile('/tmp/mychart_convo_detail.json', detailText);
              logger.debug('  Saved to /tmp/mychart_convo_detail.json');
              try {
                const detail = JSON.parse(detailText);
                logger.debug('  Detail keys:', Object.keys(detail));
                // Look for reply-related fields recursively
                const findReplyFields = (obj: Record<string, unknown>, prefix = ''): void => {
                  for (const [key, value] of Object.entries(obj)) {
                    const fullKey = prefix ? `${prefix}.${key}` : key;
                    if (key.toLowerCase().includes('reply') || key.toLowerCase().includes('send') || key.toLowerCase().includes('compose') || key.toLowerCase().includes('recipient')) {
                      logger.debug(`  Found: ${fullKey} =`, JSON.stringify(value).substring(0, 200));
                    }
                    if (value && typeof value === 'object' && !Array.isArray(value)) {
                      findReplyFields(value as Record<string, unknown>, fullKey);
                    }
                  }
                };
                findReplyFields(detail);
              } catch { /* not json */ }
              break; // Found working body format
            }
          } catch (err) {
            logger.debug(`  Error: ${(err as Error).message}`);
          }
        }
      }
    }
  }

  // Step 7: Search the HTML pages for API endpoint patterns
  logger.debug('\n--- Searching HTML for messaging API patterns ---');
  const htmlFiles = [
    { name: 'communication-center', html: commCenterHtml },
    { name: 'ask-question', html: askQuestionHtml },
    { name: 'compose', html: composeHtml },
    { name: 'medical-advice', html: marHtml },
  ];

  for (const { name, html } of htmlFiles) {
    // Look for JavaScript files that might contain messaging endpoints
    const scriptMatches = html.match(/src="[^"]*(?:message|compose|send|conversation|communication)[^"]*"/gi) || [];
    if (scriptMatches.length > 0) {
      logger.debug(`\n  ${name} - Found messaging-related scripts:`);
      for (const m of scriptMatches) {
        logger.debug(`    ${m}`);
      }
    }

    // Look for API endpoint patterns
    const apiMatches = html.match(/(?:api|Api)\/[a-zA-Z-]+\/[a-zA-Z-]+/g) || [];
    if (apiMatches.length > 0) {
      logger.debug(`\n  ${name} - Found API endpoint patterns:`);
      for (const m of [...new Set(apiMatches)]) {
        logger.debug(`    ${m}`);
      }
    }
  }

  logger.debug('\n=== Exploration complete ===');
}

explore().catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
