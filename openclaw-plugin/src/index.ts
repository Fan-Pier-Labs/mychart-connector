/**
 * OpenClaw Plugin for MyChart Health Data
 *
 * Self-contained plugin that runs all MyChart scraper code locally.
 * No server dependency — users configure credentials via plugin config
 * and get fully autonomous access to their health data.
 */

import { registerCliCommands } from './setup';
import { MyChartRequest } from '../../scrapers/myChart/myChartRequest';
import { myChartUserPassLogin, complete2faFlow } from '../../scrapers/myChart/login';
import { generateTotpCode } from '../../scrapers/myChart/totp';
import { sendTelemetryEvent } from '../../shared/telemetry';
import { checkForUpdate } from '../../shared/updateCheck';
import pluginPkg from '../package.json';

// Scraper imports
import { getMyChartProfile, getEmail } from '../../scrapers/myChart/profile';
import { getHealthSummary } from '../../scrapers/myChart/healthSummary';
import { getMedications } from '../../scrapers/myChart/medications';
import { getAllergies } from '../../scrapers/myChart/allergies';
import { getHealthIssues } from '../../scrapers/myChart/healthIssues';
import { getVitals } from '../../scrapers/myChart/vitals';
import { upcomingVisits, pastVisits } from '../../scrapers/myChart/visits/visits';
import { listLabResults, getImagingResults } from '../../scrapers/myChart/labs_and_procedure_results/labResults';
import { listConversations } from '../../scrapers/myChart/messages/conversations';
import { getConversationMessages } from '../../scrapers/myChart/messages/messageThreads';
import { sendNewMessage, getMessageRecipients, getMessageTopics, getVerificationToken } from '../../scrapers/myChart/messages/sendMessage';
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
import { getEmergencyContacts, addEmergencyContact, updateEmergencyContact, removeEmergencyContact } from '../../scrapers/myChart/emergencyContacts';
import { getGoals } from '../../scrapers/myChart/goals';
import { getUpcomingOrders } from '../../scrapers/myChart/upcomingOrders';
import { getQuestionnaires } from '../../scrapers/myChart/questionnaires';
import { getCareJourneys } from '../../scrapers/myChart/careJourneys';
import { getActivityFeed } from '../../scrapers/myChart/activityFeed';
import { getEducationMaterials } from '../../scrapers/myChart/educationMaterials';
import { getEhiExportTemplates } from '../../scrapers/myChart/ehiExport';
import { getLinkedMyChartAccounts } from '../../scrapers/myChart/other_mycharts/other_mycharts';
import { requestMedicationRefill } from '../../scrapers/myChart/medicationRefill';

// ─── Session state ───────────────────────────────────────────────────────────

let currentSession: MyChartRequest | null = null;
let sessionExpired = false;
let keepAliveCounter = 0;
let keepAliveErrorCount = 0;
let keepAliveInterval: ReturnType<typeof setInterval> | null = null;
const KEEPALIVE_INTERVAL_MS = 30_000;
const KEEPALIVE_MAX_ERRORS = 3;

/** Clear the current session (used by reset command). */
export function clearSession() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
  currentSession = null;
  sessionExpired = false;
  keepAliveErrorCount = 0;
}

interface Credentials {
  hostname: string;
  username: string;
  password: string;
  totpSecret?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCredentials(api: any): Credentials | null {
  const cfg = api.pluginConfig;
  if (!cfg?.hostname || !cfg?.username || !cfg?.password) return null;
  return {
    hostname: cfg.hostname,
    username: cfg.username,
    password: cfg.password,
    totpSecret: cfg.totpSecret || undefined,
  };
}

async function login(creds: Credentials): Promise<MyChartRequest> {
  sendTelemetryEvent('openclaw_login');
  const result = await myChartUserPassLogin({
    hostname: creds.hostname,
    user: creds.username,
    pass: creds.password,
    skipSendCode: !!creds.totpSecret,
  });

  if (result.state === 'logged_in') return result.mychartRequest;

  if (result.state === 'invalid_login') {
    throw new Error('Login failed: username or password is incorrect.');
  }

  if (result.state === 'need_2fa') {
    if (!creds.totpSecret) {
      throw new Error('MyChart requires 2FA but no TOTP secret is configured. Add totpSecret to plugin config.');
    }
    const code = await generateTotpCode(creds.totpSecret);
    const twoFa = await complete2faFlow({ mychartRequest: result.mychartRequest, code, isTOTP: true });
    if (twoFa.state === 'logged_in') return twoFa.mychartRequest;
    if (twoFa.state === 'invalid_2fa') throw new Error('TOTP code was rejected. Check your totpSecret.');
    throw new Error(`2FA failed: ${twoFa.state}`);
  }

  throw new Error(`Login failed: ${result.state}${result.error ? ` — ${result.error}` : ''}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureSession(api: any): Promise<MyChartRequest> {
  if (currentSession && !sessionExpired) return currentSession;

  const creds = getCredentials(api);
  if (!creds) throw new Error('MyChart credentials not configured. Set hostname, username, password in plugin config.');

  currentSession = await login(creds);
  sessionExpired = false;

  if (!keepAliveInterval) {
    keepAliveInterval = setInterval(async () => {
      if (!currentSession || sessionExpired) return;
      keepAliveCounter++;
      try {
        const [a, b] = await Promise.all([
          currentSession.makeRequest({ path: `/Home/KeepAlive?cnt=${keepAliveCounter}`, followRedirects: false }),
          currentSession.makeRequest({ path: `/keepalive.asp?cnt=${keepAliveCounter}`, followRedirects: false }),
        ]);
        const aBody = await a.text();
        const bBody = await b.text();
        // Only trust /Home/KeepAlive — keepalive.asp returns "0" on many modern
        // instances even when the session is alive (legacy/deprecated endpoint).
        if (aBody.trim() === '0') {
          sessionExpired = true;
        } else if (a.status !== 200 && b.status !== 200) {
          // Neither endpoint returned 200 — likely a redirect to login
          sessionExpired = true;
        } else {
          keepAliveErrorCount = 0; // success — reset error counter
        }
      } catch {
        keepAliveErrorCount++;
        if (keepAliveErrorCount >= KEEPALIVE_MAX_ERRORS) {
          sessionExpired = true;
          keepAliveErrorCount = 0;
        }
      }
    }, KEEPALIVE_INTERVAL_MS);
  }

  return currentSession;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function textResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }], details: {} };
}

function errorResult(msg: string) {
  return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], details: {} };
}

type ScraperFn = (req: MyChartRequest, params: Record<string, unknown>) => Promise<unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeTool(api: any, name: string, label: string, description: string, scraperFn: ScraperFn, parameters?: Record<string, unknown>) {
  return {
    name,
    label,
    description,
    parameters: parameters ?? { type: 'object', properties: {}, required: [] },
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      try {
        const session = await ensureSession(api);
        const data = await scraperFn(session, params);
        return textResult(data);
      } catch (err) {
        return errorResult((err as Error).message);
      }
    },
  };
}

// ─── Plugin entry ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function register(api: any) {
  sendTelemetryEvent('openclaw_plugin_started');

  // Fire-and-forget update check
  void checkForUpdate({ currentVersion: pluginPkg.version, packageName: 'plugin', logger: api.logger });

  api.logger.info('MyChart Health Data plugin loaded');

  // ── CLI commands ────────────────────────────────────────────────────────────

  registerCliCommands(api);

  // ── Tools ──────────────────────────────────────────────────────────────────

  const tools = [
    makeTool(api, 'mychart_get_profile', 'MyChart Profile', 'Get patient profile (name, DOB, MRN, PCP) and email', async (req) => {
      const profile = await getMyChartProfile(req);
      const email = await getEmail(req);
      return { ...profile, email };
    }),
    makeTool(api, 'mychart_get_health_summary', 'Health Summary', 'Get health summary (vitals, blood type, etc.)', (req) => getHealthSummary(req)),
    makeTool(api, 'mychart_get_medications', 'Medications', 'Get current medications list', (req) => getMedications(req)),
    makeTool(api, 'mychart_get_allergies', 'Allergies', 'Get allergies list', (req) => getAllergies(req)),
    makeTool(api, 'mychart_get_health_issues', 'Health Issues', 'Get health issues / active conditions', (req) => getHealthIssues(req)),
    makeTool(api, 'mychart_get_vitals', 'Vitals', 'Get vitals and track-my-health flowsheet data', (req) => getVitals(req)),
    makeTool(api, 'mychart_get_upcoming_visits', 'Upcoming Visits', 'Get upcoming appointments', (req) => upcomingVisits(req)),
    makeTool(api, 'mychart_get_past_visits', 'Past Visits', 'Get past visits (optionally specify years_back, default 2)', async (req, params) => {
      const yearsBack = (params?.years_back as number) ?? 2;
      const oldest = new Date();
      oldest.setFullYear(oldest.getFullYear() - yearsBack);
      return pastVisits(req, oldest);
    }, { type: 'object', properties: { years_back: { type: 'number', description: 'Years to look back (default 2)' } }, required: [] }),
    makeTool(api, 'mychart_get_lab_results', 'Lab Results', 'Get lab results and test details', (req) => listLabResults(req)),
    makeTool(api, 'mychart_get_imaging_results', 'Imaging Results', 'Get imaging results (X-ray, MRI, CT, etc.)', (req) => getImagingResults(req)),

    // Messages
    makeTool(api, 'mychart_get_messages', 'Messages', 'Get message conversations from communication center', (req) => listConversations(req)),
    makeTool(api, 'mychart_get_message_thread', 'Message Thread', 'Get all messages in a conversation thread', async (req, params) => {
      const id = params?.conversation_id as string;
      if (!id) throw new Error('conversation_id is required');
      return getConversationMessages(req, id);
    }, { type: 'object', properties: { conversation_id: { type: 'string', description: 'Conversation ID' } }, required: ['conversation_id'] }),
    makeTool(api, 'mychart_get_message_recipients', 'Message Recipients', 'Get providers who can receive messages', async (req) => {
      const token = await getVerificationToken(req);
      return getMessageRecipients(req, token!);
    }),
    makeTool(api, 'mychart_get_message_topics', 'Message Topics', 'Get available message topics/categories', async (req) => {
      const token = await getVerificationToken(req);
      return getMessageTopics(req, token!);
    }),
    makeTool(api, 'mychart_send_message', 'Send Message', 'Send a new message to a provider', async (req, params) => {
      return sendNewMessage(req, {
        recipient: params.recipient as Parameters<typeof sendNewMessage>[1]['recipient'],
        topic: params.topic as Parameters<typeof sendNewMessage>[1]['topic'],
        subject: params.subject as string,
        messageBody: params.message as string,
      });
    }, {
      type: 'object',
      properties: {
        recipient: { type: 'object', description: 'Recipient from mychart_get_message_recipients' },
        topic: { type: 'object', description: 'Topic from mychart_get_message_topics' },
        subject: { type: 'string', description: 'Subject line' },
        message: { type: 'string', description: 'Message body' },
      },
      required: ['recipient', 'topic', 'subject', 'message'],
    }),
    makeTool(api, 'mychart_send_reply', 'Reply to Message', 'Reply to an existing conversation', async (req, params) => {
      return sendReply(req, { conversationId: params.conversation_id as string, messageBody: params.message as string });
    }, {
      type: 'object',
      properties: { conversation_id: { type: 'string' }, message: { type: 'string' } },
      required: ['conversation_id', 'message'],
    }),
    makeTool(api, 'mychart_delete_message', 'Delete Message', 'Delete a message conversation', async (req, params) => {
      return deleteMessage(req, params.conversation_id as string);
    }, { type: 'object', properties: { conversation_id: { type: 'string' } }, required: ['conversation_id'] }),

    // Clinical
    makeTool(api, 'mychart_get_billing', 'Billing', 'Get billing history and account details', (req) => getBillingHistory(req)),
    makeTool(api, 'mychart_get_care_team', 'Care Team', 'Get care team members', (req) => getCareTeam(req)),
    makeTool(api, 'mychart_get_insurance', 'Insurance', 'Get insurance information', (req) => getInsurance(req)),
    makeTool(api, 'mychart_get_immunizations', 'Immunizations', 'Get immunization records', (req) => getImmunizations(req)),
    makeTool(api, 'mychart_get_preventive_care', 'Preventive Care', 'Get preventive care recommendations', (req) => getPreventiveCare(req)),
    makeTool(api, 'mychart_get_referrals', 'Referrals', 'Get referral information', (req) => getReferrals(req)),
    makeTool(api, 'mychart_get_medical_history', 'Medical History', 'Get medical history (past conditions, surgeries, family)', (req) => getMedicalHistory(req)),
    makeTool(api, 'mychart_get_letters', 'Letters', 'Get letters (after-visit summaries, clinical documents)', (req) => getLetters(req)),
    makeTool(api, 'mychart_get_documents', 'Documents', 'Get clinical documents', (req) => getDocuments(req)),
    makeTool(api, 'mychart_get_emergency_contacts', 'Emergency Contacts', 'Get emergency contacts', (req) => getEmergencyContacts(req)),
    makeTool(api, 'mychart_add_emergency_contact', 'Add Emergency Contact', 'Add a new emergency contact', async (req, params) => {
      return addEmergencyContact(req, {
        name: params.name as string,
        relationshipType: params.relationship_type as string,
        phoneNumber: params.phone_number as string,
      });
    }, {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Full name of the emergency contact' },
        relationship_type: { type: 'string', description: 'Relationship to patient (e.g. Spouse, Parent, Friend, Sibling)' },
        phone_number: { type: 'string', description: 'Phone number' },
      },
      required: ['name', 'relationship_type', 'phone_number'],
    }),
    makeTool(api, 'mychart_update_emergency_contact', 'Update Emergency Contact', 'Update an existing emergency contact', async (req, params) => {
      return updateEmergencyContact(req, {
        id: params.id as string,
        name: params.name as string | undefined,
        relationshipType: params.relationship_type as string | undefined,
        phoneNumber: params.phone_number as string | undefined,
      });
    }, {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Contact ID to update (from get_emergency_contacts)' },
        name: { type: 'string', description: 'New full name' },
        relationship_type: { type: 'string', description: 'New relationship type' },
        phone_number: { type: 'string', description: 'New phone number' },
      },
      required: ['id'],
    }),
    makeTool(api, 'mychart_remove_emergency_contact', 'Remove Emergency Contact', 'Remove an emergency contact', async (req, params) => {
      return removeEmergencyContact(req, params.id as string);
    }, {
      type: 'object',
      properties: { id: { type: 'string', description: 'Contact ID to remove (from get_emergency_contacts)' } },
      required: ['id'],
    }),
    makeTool(api, 'mychart_get_goals', 'Goals', 'Get care team and patient goals', (req) => getGoals(req)),
    makeTool(api, 'mychart_get_upcoming_orders', 'Upcoming Orders', 'Get upcoming orders (labs, imaging, procedures)', (req) => getUpcomingOrders(req)),
    makeTool(api, 'mychart_get_questionnaires', 'Questionnaires', 'Get questionnaires and health assessments', (req) => getQuestionnaires(req)),
    makeTool(api, 'mychart_get_care_journeys', 'Care Journeys', 'Get care journeys and care plans', (req) => getCareJourneys(req)),
    makeTool(api, 'mychart_get_activity_feed', 'Activity Feed', 'Get recent activity feed items', (req) => getActivityFeed(req)),
    makeTool(api, 'mychart_get_education_materials', 'Education Materials', 'Get assigned education materials', (req) => getEducationMaterials(req)),
    makeTool(api, 'mychart_get_ehi_export', 'EHI Export', 'Get electronic health information export templates', (req) => getEhiExportTemplates(req)),
    makeTool(api, 'mychart_get_linked_accounts', 'Linked Accounts', 'Get linked MyChart accounts from other organizations', (req) => getLinkedMyChartAccounts(req)),
    makeTool(api, 'mychart_request_refill', 'Request Refill', 'Request a medication refill', async (req, params) => {
      const key = params.medication_key as string;
      if (!key) throw new Error('medication_key is required');
      return requestMedicationRefill(req, key);
    }, { type: 'object', properties: { medication_key: { type: 'string', description: 'Medication key from medications list' } }, required: ['medication_key'] }),
  ];

  for (const tool of tools) {
    api.registerTool(tool, { name: tool.name });
  }

  // ── Service (keepalive lifecycle) ──────────────────────────────────────────

  api.registerService({
    id: 'mychart-keepalive',
    start: () => { api.logger.info('MyChart keepalive service started'); },
    stop: () => {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      currentSession = null;
      sessionExpired = false;
      api.logger.info('MyChart keepalive service stopped');
    },
  });
}
