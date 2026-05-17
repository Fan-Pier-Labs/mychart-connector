/**
 * Tool registry for the OpenRecord MCPB stdio MCP server.
 *
 * Two groups of tools:
 *   1. Meta tools — list_accounts, search_mycharts, setup_account, complete_2fa,
 *                   register_passkey, disconnect_account.
 *   2. Scraper tools — one per MyChart data category + write actions.
 *
 * Every scraper tool takes a REQUIRED `account` parameter (the MyChart
 * hostname returned by list_accounts). Multiple accounts can be configured
 * and connected at once; there is no "active account" state.
 *
 * Setup is a sequence of explicit tool calls (no MCP elicitation):
 *   list_accounts                                  // see what's already set up
 *   search_mycharts(query="uchealth")              // find the hostname for a new account
 *   setup_account(hostname, username, password)    // attempt login
 *   complete_2fa(pending_id, code)                 // only if setup_account said need_2fa
 *   register_passkey(account)                      // optional: skip 2FA on future sessions
 */

import { z, type ZodRawShape } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MyChartRequest } from '../../scrapers/myChart/myChartRequest';

import { myChartUserPassLogin, complete2faFlow } from '../../scrapers/myChart/login';
import { setupPasskey } from '../../scrapers/myChart/setupPasskey';
import { serializeCredential } from '../../scrapers/myChart/softwareAuthenticator';

import { getMyChartProfile, getEmail } from '../../scrapers/myChart/profile';
import { getHealthSummary } from '../../scrapers/myChart/healthSummary';
import { getMedications } from '../../scrapers/myChart/medications';
import { getAllergies } from '../../scrapers/myChart/allergies';
import { getHealthIssues } from '../../scrapers/myChart/healthIssues';
import { getVitals } from '../../scrapers/myChart/vitals';
import { upcomingVisits, pastVisits } from '../../scrapers/myChart/visits/visits';
import { getVisitNotes, getNoteContent, getVisitAVS } from '../../scrapers/myChart/notes/notes';
import { listLabResults, getImagingResults } from '../../scrapers/myChart/labs_and_procedure_results/labResults';
import { listConversations } from '../../scrapers/myChart/messages/conversations';
import { getConversationMessages } from '../../scrapers/myChart/messages/messageThreads';
import {
  sendNewMessage,
  getMessageRecipients,
  getMessageTopics,
  getVerificationToken,
} from '../../scrapers/myChart/messages/sendMessage';
import { sendReply } from '../../scrapers/myChart/messages/sendReply';
import { deleteMessage } from '../../scrapers/myChart/messages/deleteMessage';
import { getBillingHistory } from '../../scrapers/myChart/bills/bills';
import { getCareTeam } from '../../scrapers/myChart/careTeam';
import { getInsurance } from '../../scrapers/myChart/insurance';
import { getImmunizations } from '../../scrapers/myChart/immunizations';
import { getPreventiveCare } from '../../scrapers/myChart/preventiveCare';
import { getReferrals } from '../../scrapers/myChart/referrals';
import { getMedicalHistory } from '../../scrapers/myChart/medicalHistory';
import { getLetters } from '../../scrapers/myChart/letters';
import { getDocuments } from '../../scrapers/myChart/documents';
import {
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  removeEmergencyContact,
} from '../../scrapers/myChart/emergencyContacts';
import { getGoals } from '../../scrapers/myChart/goals';
import { getUpcomingOrders } from '../../scrapers/myChart/upcomingOrders';
import { getQuestionnaires } from '../../scrapers/myChart/questionnaires';
import { getCareJourneys } from '../../scrapers/myChart/careJourneys';
import { getActivityFeed } from '../../scrapers/myChart/activityFeed';
import { getEducationMaterials } from '../../scrapers/myChart/educationMaterials';
import { getEhiExportTemplates } from '../../scrapers/myChart/ehiExport';
import { getLinkedMyChartAccounts } from '../../scrapers/myChart/other_mycharts/other_mycharts';
import { requestMedicationRefill } from '../../scrapers/myChart/medicationRefill';
import { downloadImagingStudyDirect } from '../../scrapers/myChart/eunity/imagingDirectDownload';
import { convertCloToBitmap16 } from '../../scrapers/myChart/clo-image-parser/clo_to_bitmap';

import { searchInstances } from './instances';
import {
  resolveSession,
  isConnected,
  clearSession,
  adoptSession,
} from './session-manager';
import {
  readAccounts,
  readAccountPasskey,
  removeAccount,
  upsertAccount,
  saveAccountPasskey,
  normalizeHostname,
  findAccount,
} from './credential-store';
import { addPending, takePending } from './pending-logins';
import { encodeCloAsJpeg } from './imaging/jpeg-encoder';

// ── Result helpers ──────────────────────────────────────────────────────────

type ToolContent = { type: 'text'; text: string };
type ToolResult = { content: ToolContent[]; isError?: boolean };

function jsonResult(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function textResult(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

function errorResult(message: string): ToolResult {
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

// ── Scraper tool registration helper ───────────────────────────────────────

type ScraperHandler<Args> = (req: MyChartRequest, args: Args) => Promise<unknown>;

/**
 * Registers a scraper tool that requires an `account` (MyChart hostname).
 * `kind` controls the MCP annotations Claude Desktop uses for grouping:
 *   - 'read'  → readOnlyHint: true
 *   - 'write' → readOnlyHint: false, destructiveHint: true (mutates MyChart)
 */
function registerScraperTool<Shape extends ZodRawShape>(
  server: McpServer,
  name: string,
  description: string,
  inputShape: Shape,
  handler: ScraperHandler<z.infer<z.ZodObject<Shape>> & { account: string }>,
  opts: { kind: 'read' | 'write'; title?: string } = { kind: 'read' },
): void {
  const fullShape = {
    account: z.string().describe('MyChart hostname (the "account" / "account_id" — get the exact value from list_accounts).'),
    ...inputShape,
  };
  const annotations =
    opts.kind === 'read'
      ? { readOnlyHint: true, openWorldHint: true, ...(opts.title ? { title: opts.title } : {}) }
      : { readOnlyHint: false, destructiveHint: true, openWorldHint: true, ...(opts.title ? { title: opts.title } : {}) };
  server.registerTool(
    name,
    {
      description,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputSchema: fullShape as any,
      annotations,
    },
    async (args: Record<string, unknown>) => {
      try {
        const acct = typeof args.account === 'string' ? args.account : '';
        const session = await resolveSession(acct);
        const data = await handler(session, args as z.infer<z.ZodObject<Shape>> & { account: string });
        return jsonResult(data);
      } catch (err) {
        return errorResult((err as Error).message);
      }
    },
  );
}

// ── Public: register everything on the server ──────────────────────────────

export function registerAllTools(server: McpServer): void {
  // ── Meta tools ────────────────────────────────────────────────────────────

  server.registerTool(
    'list_accounts',
    {
      title: 'List configured accounts',
      description: 'Returns every MyChart account that has been set up on this machine. Use the `hostname` field from each result as the `account` parameter for any other tool. Always call this first if you do not already know the account hostname.',
      inputSchema: {} as ZodRawShape,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      const accounts = readAccounts();
      return jsonResult({
        count: accounts.length,
        accounts: accounts.map(a => ({
          account: a.hostname,
          hostname: a.hostname,
          username: a.username,
          connected: isConnected(a.hostname),
          hasPasskey: !!readAccountPasskey(a.hostname),
          hasTotpSecret: !!a.totpSecret,
        })),
      });
    },
  );

  server.registerTool(
    'search_mycharts',
    {
      title: 'Search the MyChart directory',
      description: "Look up a MyChart hostname for setup. Type a few letters of the user's health system name (e.g. \"uchealth\", \"mass general\"). Returns matching entries with their hostname, display name, and logo URL. Pass the chosen `hostname` to setup_account.",
      inputSchema: {
        query: z.string().min(1).describe('Substring of the health system name to search for (case-insensitive).'),
        limit: z.number().int().min(1).max(50).optional().describe('Maximum results to return (default 10).'),
      } satisfies ZodRawShape,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query, limit }) => {
      const matches = searchInstances(query, limit ?? 10);
      return jsonResult({
        query,
        count: matches.length,
        matches: matches.map(m => ({ hostname: m.hostname, name: m.name, logoUrl: m.logoUrl, loginUrl: m.url })),
      });
    },
  );

  server.registerTool(
    'setup_account',
    {
      title: 'Set up a MyChart account (step 1)',
      description: "Attempt to log into MyChart and save the account for future calls. The model should first ask the user for their MyChart hostname (use search_mycharts to look it up) and credentials in chat, then call this tool. Returns one of: `{state:\"logged_in\", account}`, `{state:\"need_2fa\", pending_id, delivery, target}` (call complete_2fa next with the user-supplied code), or `{state:\"invalid_login\"}`.",
      inputSchema: {
        hostname: z.string().describe('MyChart hostname, e.g. "mychart.example.org". From search_mycharts or the user.'),
        username: z.string().describe('MyChart username (ask the user).'),
        password: z.string().describe('MyChart password (ask the user). Stored locally on disk, never transmitted to Anthropic.'),
      } satisfies ZodRawShape,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ hostname, username, password }) => {
      try {
        const result = await myChartUserPassLogin({ hostname, user: username, pass: password });

        if (result.state === 'logged_in') {
          upsertAccount({ hostname: normalizeHostname(hostname), username, password });
          await adoptSession(hostname, result.mychartRequest);
          return jsonResult({
            state: 'logged_in',
            account: normalizeHostname(hostname),
            message: 'Account connected. Future tool calls can pass this hostname as `account`. Consider calling register_passkey next so future sessions skip the password and 2FA prompts.',
          });
        }

        if (result.state === 'invalid_login') {
          return jsonResult({
            state: 'invalid_login',
            account: normalizeHostname(hostname),
            message: 'MyChart rejected those credentials. Double-check the username + password with the user and call setup_account again.',
          });
        }

        if (result.state === 'need_2fa') {
          const pending_id = addPending({
            hostname: normalizeHostname(hostname),
            username,
            password,
            mychartRequest: result.mychartRequest,
          });
          return jsonResult({
            state: 'need_2fa',
            pending_id,
            account: normalizeHostname(hostname),
            delivery: result.twoFaDelivery ?? null,
            message: 'MyChart sent a 6-digit verification code. Ask the user for it, then call complete_2fa with this pending_id and the code.',
          });
        }

        return jsonResult({
          state: result.state,
          account: normalizeHostname(hostname),
          error: result.error ?? null,
          message: `Login ended in unexpected state: ${result.state}. Tell the user and try again.`,
        });
      } catch (err) {
        return errorResult((err as Error).message);
      }
    },
  );

  server.registerTool(
    'complete_2fa',
    {
      title: 'Finish 2FA (step 2)',
      description: 'Finish a setup_account flow that returned `need_2fa`. Pass the `pending_id` from that response and the 6-digit code the user gave you. On success the account is saved and immediately usable.',
      inputSchema: {
        pending_id: z.string().describe('The pending_id returned by setup_account when state was need_2fa.'),
        code: z.string().describe('6-digit code the user read from email/SMS/authenticator.'),
      } satisfies ZodRawShape,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ pending_id, code }) => {
      const pending = takePending(pending_id);
      if (!pending) {
        return errorResult('pending_id is unknown or has expired (10-minute TTL). Call setup_account again to start over.');
      }
      try {
        const trimmed = code.trim();
        const twoFa = await complete2faFlow({
          mychartRequest: pending.mychartRequest,
          code: trimmed,
          isTOTP: false,
        });
        if (twoFa.state === 'logged_in') {
          upsertAccount({ hostname: pending.hostname, username: pending.username, password: pending.password });
          await adoptSession(pending.hostname, twoFa.mychartRequest);
          return jsonResult({
            state: 'logged_in',
            account: pending.hostname,
            message: 'Account connected. Future tool calls can pass this hostname as `account`. Consider calling register_passkey next so future sessions skip the password and 2FA prompts.',
          });
        }
        if (twoFa.state === 'invalid_2fa') {
          // Re-stash so the agent can ask the user again without restarting.
          const newPendingId = addPending({
            hostname: pending.hostname,
            username: pending.username,
            password: pending.password,
            mychartRequest: pending.mychartRequest,
          });
          return jsonResult({
            state: 'invalid_2fa',
            pending_id: newPendingId,
            account: pending.hostname,
            message: 'That code was rejected. Ask the user for the code again and call complete_2fa with this new pending_id.',
          });
        }
        return jsonResult({
          state: twoFa.state,
          account: pending.hostname,
          message: `Unexpected 2FA result: ${twoFa.state}. Tell the user and call setup_account again.`,
        });
      } catch (err) {
        return errorResult((err as Error).message);
      }
    },
  );

  server.registerTool(
    'register_passkey',
    {
      title: 'Register a passkey on an account (optional, recommended)',
      description: 'Register a passkey on an already-connected MyChart account so future logins skip the password and 2FA prompts entirely. Idempotent — calling it again just adds another passkey.',
      inputSchema: {
        account: z.string().describe('MyChart hostname (the account from list_accounts).'),
      } satisfies ZodRawShape,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ account }) => {
      try {
        const session = await resolveSession(account);
        const credential = await setupPasskey(session);
        if (!credential) {
          return errorResult('Passkey registration failed: MyChart did not return a credential. Some instances disable passkey registration via the patient portal.');
        }
        saveAccountPasskey(account, serializeCredential(credential));
        return textResult(`Passkey saved for ${normalizeHostname(account)}. Future sessions will skip the password and 2FA prompts.`);
      } catch (err) {
        return errorResult((err as Error).message);
      }
    },
  );

  server.registerTool(
    'disconnect_account',
    {
      title: 'Forget a MyChart account',
      description: 'Forget a saved MyChart account. Deletes the local credentials, passkey, and cached session for this hostname.',
      inputSchema: {
        account: z.string().describe('MyChart hostname (the account from list_accounts).'),
      } satisfies ZodRawShape,
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    },
    async ({ account }) => {
      clearSession(account);
      const removed = removeAccount(account);
      const known = findAccount(account);
      if (!removed && !known) return textResult(`No saved account for ${account}.`);
      return textResult(`Forgot ${normalizeHostname(account)}. Credentials, passkey, and session cache have been deleted from disk.`);
    },
  );

  // ── Profile / overview ────────────────────────────────────────────────────

  registerScraperTool(server, 'get_profile', 'Patient profile (name, DOB, MRN, PCP) + email address.', {}, async (req) => {
    const profile = await getMyChartProfile(req);
    let email: string | undefined;
    try { email = await getEmail(req); } catch { /* ignore */ }
    return { ...profile, email };
  });

  registerScraperTool(server, 'get_health_summary', 'Health summary (vitals, blood type, smoking status, etc.).', {}, (req) => getHealthSummary(req));
  registerScraperTool(server, 'get_medications', 'Current medications list with dosage, sig, and pharmacy info.', {}, (req) => getMedications(req));
  registerScraperTool(server, 'get_allergies', 'Known allergies with reaction and severity.', {}, (req) => getAllergies(req));
  registerScraperTool(server, 'get_health_issues', 'Active health issues / problem list.', {}, (req) => getHealthIssues(req));
  registerScraperTool(server, 'get_vitals', 'Vitals + tracked flowsheet readings (weight, BP, heart rate, etc.).', {}, (req) => getVitals(req));
  registerScraperTool(server, 'get_immunizations', 'Vaccination history.', {}, (req) => getImmunizations(req));
  registerScraperTool(server, 'get_preventive_care', 'Preventive care recommendations (overdue / upcoming screenings).', {}, (req) => getPreventiveCare(req));
  registerScraperTool(server, 'get_medical_history', 'Past medical, surgical, family, social history.', {}, (req) => getMedicalHistory(req));
  registerScraperTool(server, 'get_goals', 'Care team + patient goals.', {}, (req) => getGoals(req));

  // ── Visits + notes ────────────────────────────────────────────────────────

  registerScraperTool(server, 'get_upcoming_visits', 'Upcoming appointments.', {}, (req) => upcomingVisits(req));
  registerScraperTool(server, 'get_past_visits', 'Past visits within the last `years_back` years (default 2).', {
    years_back: z.number().int().min(1).max(20).optional().describe('How many years back to fetch (default 2).'),
  }, async (req, { years_back }) => {
    const oldest = new Date();
    oldest.setFullYear(oldest.getFullYear() - (years_back ?? 2));
    return pastVisits(req, oldest);
  });
  registerScraperTool(server, 'get_visit_notes', 'List clinical notes (operative, progress, anesthesia, etc.) for a past visit. Returns hnoId, hnoDat, lrpId — pass these into get_note_content.', {
    csn: z.string().describe('Visit CSN (encounter ID) from get_past_visits.'),
  }, (req, { csn }) => getVisitNotes(req, csn));
  registerScraperTool(server, 'get_note_content', 'Fetch the rendered HTML content of a single clinical note.', {
    csn: z.string(),
    lrp_id: z.string(),
    hno_id: z.string(),
    hno_dat: z.string(),
  }, (req, { csn, lrp_id, hno_id, hno_dat }) => getNoteContent(req, { csn, lrpId: lrp_id, hnoId: hno_id, hnoDat: hno_dat }));
  registerScraperTool(server, 'get_visit_avs', 'After Visit Summary (AVS) HTML for a past visit.', {
    csn: z.string().describe('Visit CSN from get_past_visits.'),
  }, (req, { csn }) => getVisitAVS(req, csn));

  // ── Results ───────────────────────────────────────────────────────────────

  registerScraperTool(server, 'get_lab_results', 'Lab results with reference ranges and trending.', {}, (req) => listLabResults(req));
  registerScraperTool(server, 'get_imaging_results', 'Imaging results metadata (X-ray, MRI, CT, US, etc.). Use download_imaging_study for the actual images.', {}, (req) => getImagingResults(req));

  registerScraperTool(server, 'download_imaging_study',
    'Download a single imaging study and return the first N images as JPEGs (base64). The MCPB encodes locally — no native sharp dependency.',
    {
      study_id: z.string().describe('Imaging study ID from get_imaging_results.'),
      max_images: z.number().int().min(1).max(20).optional().describe('Maximum number of images to encode and return (default 3).'),
      jpeg_quality: z.number().int().min(1).max(100).optional().describe('JPEG quality 1-100 (default 85).'),
    },
    async (req, { study_id, max_images, jpeg_quality }) => {
      const downloaded = await downloadImagingStudyDirect(req, { studyId: study_id });
      if (!downloaded || !downloaded.images || downloaded.images.length === 0) {
        return { study_id, images: [] };
      }
      const limit = Math.min(downloaded.images.length, max_images ?? 3);
      const out: Array<{ index: number; width: number; height: number; bytes: number; jpegBase64: string }> = [];
      for (let i = 0; i < limit; i++) {
        const img = downloaded.images[i];
        try {
          const bm = convertCloToBitmap16(img.cloData);
          const encoded = encodeCloAsJpeg(bm, jpeg_quality ?? 85);
          out.push({
            index: i,
            width: encoded.width,
            height: encoded.height,
            bytes: encoded.bytes,
            jpegBase64: Buffer.from(encoded.buffer).toString('base64'),
          });
        } catch (err) {
          out.push({ index: i, width: 0, height: 0, bytes: 0, jpegBase64: `Error encoding image: ${(err as Error).message}` });
        }
      }
      return { study_id, total_images: downloaded.images.length, returned: out.length, images: out };
    },
  );

  // ── Messages ──────────────────────────────────────────────────────────────

  registerScraperTool(server, 'get_messages', 'Inbox message conversations.', {}, (req) => listConversations(req));
  registerScraperTool(server, 'get_message_thread', 'Full message thread by conversation ID.', {
    conversation_id: z.string(),
  }, (req, { conversation_id }) => getConversationMessages(req, conversation_id));
  registerScraperTool(server, 'get_message_recipients', 'List providers who can receive new messages.', {}, async (req) => {
    const token = await getVerificationToken(req);
    if (!token) throw new Error('Could not get verification token for message recipients.');
    return getMessageRecipients(req, token);
  });
  registerScraperTool(server, 'get_message_topics', 'List available message topics/categories.', {}, async (req) => {
    const token = await getVerificationToken(req);
    if (!token) throw new Error('Could not get verification token for message topics.');
    return getMessageTopics(req, token);
  });
  registerScraperTool(server, 'send_message',
    'Send a new message to a care team provider. Get `recipient` from get_message_recipients and `topic` from get_message_topics.',
    {
      recipient: z.unknown().describe('Recipient object from get_message_recipients.'),
      topic: z.unknown().describe('Topic object from get_message_topics.'),
      subject: z.string(),
      message: z.string(),
    },
    (req, { recipient, topic, subject, message }) => sendNewMessage(req, {
      recipient: recipient as Parameters<typeof sendNewMessage>[1]['recipient'],
      topic: topic as Parameters<typeof sendNewMessage>[1]['topic'],
      subject,
      messageBody: message,
    }),
    { kind: 'write' },
  );
  registerScraperTool(server, 'send_reply', 'Reply to an existing message conversation.', {
    conversation_id: z.string(),
    message: z.string(),
  }, (req, { conversation_id, message }) => sendReply(req, { conversationId: conversation_id, messageBody: message }), { kind: 'write' });
  registerScraperTool(server, 'delete_message', 'Delete a message conversation.', {
    conversation_id: z.string(),
  }, (req, { conversation_id }) => deleteMessage(req, conversation_id), { kind: 'write' });

  // ── Billing / coverage ────────────────────────────────────────────────────

  registerScraperTool(server, 'get_billing', 'Billing history and account balance.', {}, (req) => getBillingHistory(req));
  registerScraperTool(server, 'get_insurance', 'Insurance coverage info.', {}, (req) => getInsurance(req));

  // ── Care team / coordination ──────────────────────────────────────────────

  registerScraperTool(server, 'get_care_team', 'Members of the care team.', {}, (req) => getCareTeam(req));
  registerScraperTool(server, 'get_referrals', 'Active and past referrals.', {}, (req) => getReferrals(req));
  registerScraperTool(server, 'get_letters', 'Letters: after-visit summaries, clinical letters.', {}, (req) => getLetters(req));
  registerScraperTool(server, 'get_documents', 'Clinical documents and visit records.', {}, (req) => getDocuments(req));
  registerScraperTool(server, 'get_upcoming_orders', 'Upcoming orders (labs, imaging, procedures).', {}, (req) => getUpcomingOrders(req));
  registerScraperTool(server, 'get_questionnaires', 'Open questionnaires / health assessments.', {}, (req) => getQuestionnaires(req));
  registerScraperTool(server, 'get_care_journeys', 'Care journeys / care plans.', {}, (req) => getCareJourneys(req));
  registerScraperTool(server, 'get_activity_feed', 'Recent activity feed items.', {}, (req) => getActivityFeed(req));
  registerScraperTool(server, 'get_education_materials', 'Assigned education materials.', {}, (req) => getEducationMaterials(req));
  registerScraperTool(server, 'get_ehi_export', 'Electronic Health Information (EHI) export templates.', {}, (req) => getEhiExportTemplates(req));
  registerScraperTool(server, 'get_linked_accounts', 'Linked MyChart accounts at other organizations.', {}, (req) => getLinkedMyChartAccounts(req));

  // ── Emergency contacts ────────────────────────────────────────────────────

  registerScraperTool(server, 'get_emergency_contacts', 'List configured emergency contacts.', {}, (req) => getEmergencyContacts(req));
  registerScraperTool(server, 'add_emergency_contact', 'Add a new emergency contact.', {
    name: z.string(),
    relationship_type: z.string().describe('e.g. "Spouse", "Parent", "Sibling", "Friend".'),
    phone_number: z.string(),
  }, (req, { name, relationship_type, phone_number }) => addEmergencyContact(req, {
    name,
    relationshipType: relationship_type,
    phoneNumber: phone_number,
  }), { kind: 'write' });
  registerScraperTool(server, 'update_emergency_contact', 'Update an existing emergency contact (only the fields you pass are changed).', {
    id: z.string().describe('Contact ID from get_emergency_contacts.'),
    name: z.string().optional(),
    relationship_type: z.string().optional(),
    phone_number: z.string().optional(),
  }, (req, { id, name, relationship_type, phone_number }) => updateEmergencyContact(req, {
    id,
    name,
    relationshipType: relationship_type,
    phoneNumber: phone_number,
  }), { kind: 'write' });
  registerScraperTool(server, 'remove_emergency_contact', 'Remove an emergency contact by ID.', {
    id: z.string(),
  }, (req, { id }) => removeEmergencyContact(req, id), { kind: 'write' });

  // ── Prescriptions ─────────────────────────────────────────────────────────

  registerScraperTool(server, 'request_refill', 'Request a refill for a current medication.', {
    medication_key: z.string().describe('Medication key from get_medications.'),
  }, (req, { medication_key }) => requestMedicationRefill(req, medication_key), { kind: 'write' });
}
