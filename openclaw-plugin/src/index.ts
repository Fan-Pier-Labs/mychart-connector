/**
 * OpenClaw Plugin for MyChart Health Data — Multi-Account
 *
 * Self-contained plugin that runs all MyChart scraper code locally.
 * No server dependency — users configure credentials via plugin config
 * and get fully autonomous access to their health data.
 *
 * Supports multiple MyChart accounts. Each tool accepts an optional
 * `account` parameter (hostname) to target a specific account. If only
 * one account is configured, it's selected automatically.
 */

import { registerCliCommands } from './setup';
import { MyChartRequest } from '../../scrapers/myChart/myChartRequest';
import { myChartUserPassLogin, myChartPasskeyLogin, complete2faFlow } from '../../scrapers/myChart/login';
import { setupPasskey } from '../../scrapers/myChart/setupPasskey';
import { generateTotpCode } from '../../scrapers/myChart/totp';
import { deserializeCredential, serializeCredential } from '../../scrapers/myChart/softwareAuthenticator';
import {
  readAccounts, readAccountPasskey, saveAccountPasskey, clearAccountPasskey,
  normalizeHostname, type AccountConfig,
} from './config';
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

// ─── Session state (per-account) ────────────────────────────────────────────

interface SessionEntry {
  session: MyChartRequest;
  expired: boolean;
  keepAliveCounter: number;
  keepAliveErrorCount: number;
  keepAliveInterval: ReturnType<typeof setInterval> | null;
}

const sessions = new Map<string, SessionEntry>(); // keyed by normalized hostname
const loginLocks = new Map<string, Promise<MyChartRequest>>(); // prevent concurrent logins

const KEEPALIVE_INTERVAL_MS = 30_000;
const KEEPALIVE_MAX_ERRORS = 3;

/** Clear the session for a specific account. */
export function clearSession(hostname: string) {
  const key = normalizeHostname(hostname);
  const entry = sessions.get(key);
  if (entry?.keepAliveInterval) clearInterval(entry.keepAliveInterval);
  sessions.delete(key);
  loginLocks.delete(key);
}

/** Clear all sessions. */
export function clearAllSessions() {
  for (const [, entry] of sessions) {
    if (entry.keepAliveInterval) clearInterval(entry.keepAliveInterval);
  }
  sessions.clear();
  loginLocks.clear();
}

/** Check if an account has an active (non-expired) session. */
export function isConnected(hostname: string): boolean {
  const entry = sessions.get(normalizeHostname(hostname));
  return !!entry && !entry.expired;
}

// ─── Active account (single-tenant: one conversation at a time) ─────────────

/**
 * The currently selected account hostname set by mychart_select_account.
 * Used as fallback when multiple accounts are configured and no explicit
 * `account` parameter is passed to a tool.
 */
let activeAccountHostname: string | null = null;

/** Set the active account. */
export function setActiveAccount(hostname: string) {
  activeAccountHostname = normalizeHostname(hostname);
}

/** Clear the active account selection. */
export function clearActiveAccount() {
  activeAccountHostname = null;
}

/** Get the current active account hostname (or null). */
export function getActiveAccount(): string | null {
  return activeAccountHostname;
}

// ─── Login ──────────────────────────────────────────────────────────────────

async function loginAccount(account: AccountConfig): Promise<MyChartRequest> {
  const hostname = normalizeHostname(account.hostname);

  sendTelemetryEvent('openclaw_login');

  const passkeySerialized = readAccountPasskey(hostname);

  // 1. Try passkey login first (bypasses 2FA entirely)
  if (passkeySerialized) {
    try {
      const credential = deserializeCredential(passkeySerialized);
      const result = await myChartPasskeyLogin({ hostname, credential });
      if (result.state === 'logged_in') {
        saveAccountPasskey(hostname, serializeCredential(credential));
        return result.mychartRequest;
      }
      console.error(`[mychart:${hostname}] Passkey login failed, falling back to password login.`);
      clearAccountPasskey(hostname);
    } catch (err) {
      console.error(`[mychart:${hostname}] Passkey login error: ${(err as Error).message}. Falling back to password.`);
      clearAccountPasskey(hostname);
    }
  }

  // 2. Password + optional TOTP login
  const result = await myChartUserPassLogin({
    hostname,
    user: account.username,
    pass: account.password,
    skipSendCode: !!account.totpSecret,
  });

  if (result.state === 'logged_in') {
    if (!passkeySerialized) void trySetupPasskey(hostname, result.mychartRequest);
    return result.mychartRequest;
  }

  if (result.state === 'invalid_login') {
    throw new Error(`Login failed for ${hostname}: username or password is incorrect.`);
  }

  if (result.state === 'need_2fa') {
    if (account.totpSecret) {
      const code = await generateTotpCode(account.totpSecret);
      const twoFa = await complete2faFlow({ mychartRequest: result.mychartRequest, code, isTOTP: true });
      if (twoFa.state === 'logged_in') {
        if (!passkeySerialized) void trySetupPasskey(hostname, twoFa.mychartRequest);
        return twoFa.mychartRequest;
      }
      if (twoFa.state === 'invalid_2fa') throw new Error(`TOTP code was rejected for ${hostname}. Check your totpSecret.`);
      throw new Error(`2FA failed for ${hostname}: ${twoFa.state}`);
    }
    throw new Error(`MyChart requires 2FA for ${hostname} but no passkey or TOTP is configured. Run \`openclaw openrecord setup\` to set up a passkey.`);
  }

  throw new Error(`Login failed for ${hostname}: ${result.state}${result.error ? ` — ${result.error}` : ''}`);
}

/** Try to register a passkey after successful login. Non-fatal on failure. */
async function trySetupPasskey(hostname: string, mychartRequest: MyChartRequest): Promise<void> {
  try {
    const credential = await setupPasskey(mychartRequest);
    if (credential) {
      saveAccountPasskey(hostname, serializeCredential(credential));
      console.error(`[mychart:${hostname}] Passkey registered for future logins.`);
    }
  } catch (err) {
    console.error(`[mychart:${hostname}] Passkey auto-setup failed: ${(err as Error).message}`);
  }
}

/** Ensure a session exists for a specific account, creating one if needed. */
async function ensureAccountSession(account: AccountConfig): Promise<MyChartRequest> {
  const key = normalizeHostname(account.hostname);
  const entry = sessions.get(key);

  if (entry && !entry.expired) return entry.session;

  // Clear expired session
  if (entry) clearSession(key);

  // Prevent concurrent logins — reuse in-flight login promise
  const existingLock = loginLocks.get(key);
  if (existingLock) return existingLock;

  const loginPromise = loginAccount(account).then(session => {
    const newEntry: SessionEntry = {
      session,
      expired: false,
      keepAliveCounter: 0,
      keepAliveErrorCount: 0,
      keepAliveInterval: null,
    };

    // Start per-account keepalive
    newEntry.keepAliveInterval = setInterval(async () => {
      if (newEntry.expired) return;
      newEntry.keepAliveCounter++;
      try {
        const [a, b] = await Promise.all([
          session.makeRequest({ path: `/Home/KeepAlive?cnt=${newEntry.keepAliveCounter}`, followRedirects: false }),
          session.makeRequest({ path: `/keepalive.asp?cnt=${newEntry.keepAliveCounter}`, followRedirects: false }),
        ]);
        const aBody = await a.text();
        if (aBody.trim() === '0') {
          newEntry.expired = true;
        } else if (a.status !== 200 && b.status !== 200) {
          newEntry.expired = true;
        } else {
          newEntry.keepAliveErrorCount = 0;
        }
      } catch {
        newEntry.keepAliveErrorCount++;
        if (newEntry.keepAliveErrorCount >= KEEPALIVE_MAX_ERRORS) {
          newEntry.expired = true;
          newEntry.keepAliveErrorCount = 0;
        }
      }
    }, KEEPALIVE_INTERVAL_MS);

    sessions.set(key, newEntry);
    loginLocks.delete(key);
    return session;
  }).catch(err => {
    loginLocks.delete(key);
    throw err;
  });

  loginLocks.set(key, loginPromise);
  return loginPromise;
}

// ─── Multi-account resolution ───────────────────────────────────────────────

/**
 * Resolve a MyChartRequest for the given account hostname, or auto-select
 * if only one account is configured. Mirrors the web app's resolveRequest().
 */
export async function resolveSession(account?: string): Promise<MyChartRequest> {
  const accounts = readAccounts();

  if (accounts.length === 0) {
    throw new Error('No MyChart accounts configured. Run `openclaw openrecord setup` to add one.');
  }

  // Explicit account requested
  if (account) {
    const normalized = normalizeHostname(account);
    const found = accounts.find(a => normalizeHostname(a.hostname) === normalized);
    if (!found) {
      const available = accounts.map(a => a.hostname).join(', ');
      throw new Error(`Account '${account}' not found. Available: ${available}`);
    }
    return ensureAccountSession(found);
  }

  // Single account — auto-select
  if (accounts.length === 1) {
    return ensureAccountSession(accounts[0]);
  }

  // Multiple accounts — check which are already connected
  let connected = accounts.filter(a => isConnected(a.hostname));

  // If none connected, auto-connect all accounts (like the web app does)
  if (connected.length === 0) {
    for (const acct of accounts) {
      try {
        await ensureAccountSession(acct);
      } catch {
        // Login failed for this account — continue with others
      }
    }
    connected = accounts.filter(a => isConnected(a.hostname));
  }

  if (connected.length === 1) {
    return ensureAccountSession(connected[0]);
  }

  if (connected.length === 0) {
    const hostnames = accounts.map(a => a.hostname).join(', ');
    throw new Error(`Could not connect to any MyChart account. Use mychart_select_account to pick one: ${hostnames}`);
  }

  // Multiple connected — check if there's an active account set by mychart_select_account
  if (activeAccountHostname) {
    const activeAccount = accounts.find(a => normalizeHostname(a.hostname) === activeAccountHostname);
    if (activeAccount) {
      return ensureAccountSession(activeAccount);
    }
  }

  // No active account set — agent must use mychart_select_account
  const hostnames = connected.map(a => a.hostname).join(', ');
  throw new Error(`Multiple MyChart accounts connected. Use mychart_select_account to pick one: ${hostnames}`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function textResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: data !== undefined ? JSON.stringify(data, null, 2) : 'null' }], details: {} };
}

function errorResult(msg: string) {
  return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], details: {} };
}

type ScraperFn = (req: MyChartRequest, params: Record<string, unknown>) => Promise<unknown>;

function makeTool(name: string, label: string, description: string, scraperFn: ScraperFn, parameters?: Record<string, unknown>) {
  // Inject `account` parameter into every tool's schema
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseProps = (parameters as any)?.properties ?? {};
  const mergedParams = {
    type: 'object',
    properties: {
      account: { type: 'string', description: 'MyChart account hostname (required if multiple accounts configured)' },
      ...baseProps,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    required: [...((parameters as any)?.required ?? [])],
  };

  return {
    name,
    label,
    description,
    parameters: mergedParams,
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      try {
        const session = await resolveSession(params.account as string | undefined);
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
    // Meta tool — list all accounts
    {
      name: 'mychart_list_accounts',
      label: 'List Accounts',
      description: 'List all configured MyChart accounts and their connection status',
      parameters: { type: 'object', properties: {}, required: [] },
      async execute() {
        try {
          const accounts = readAccounts();
          const result = accounts.map(a => ({
            hostname: a.hostname,
            username: a.username,
            connected: isConnected(a.hostname),
            hasPasskey: !!readAccountPasskey(a.hostname),
            hasTotpSecret: !!a.totpSecret,
          }));
          return textResult(result);
        } catch (err) {
          return errorResult((err as Error).message);
        }
      },
    },

    // Meta tool — select active account (match first, then connect)
    {
      name: 'mychart_select_account',
      label: 'Select Account',
      description: 'Select which MyChart account to use for subsequent tool calls. Pass a keyword like "uchealth" or "denver" to match against configured accounts. ALWAYS call this first when the user mentions a specific hospital or health system.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Keyword to match against account hostnames and usernames (e.g. "uchealth", "denver")' },
        },
        required: ['query'],
      },
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        try {
          const query = (params.query as string || '').toLowerCase().trim();
          if (!query) return errorResult('query parameter is required');

          const accounts = readAccounts();
          if (accounts.length === 0) {
            return errorResult('No MyChart accounts configured. Run `openclaw openrecord setup` to add one.');
          }

          // Build account info list (for returning in all cases)
          const accountList = accounts.map(a => ({
            hostname: a.hostname,
            username: a.username,
            connected: isConnected(a.hostname),
            hasPasskey: !!readAccountPasskey(a.hostname),
          }));

          // Match query against hostnames and usernames (case-insensitive substring)
          const matches = accounts.filter(a =>
            a.hostname.toLowerCase().includes(query) ||
            a.username.toLowerCase().includes(query)
          );

          if (matches.length === 0) {
            return textResult({
              error: `No account matching "${params.query}". Available accounts listed below.`,
              selected: null,
              accounts: accountList,
            });
          }

          if (matches.length > 1) {
            const matched = matches.map(a => a.hostname);
            return textResult({
              error: `Multiple accounts match "${params.query}": ${matched.join(', ')}. Be more specific.`,
              selected: null,
              accounts: accountList,
            });
          }

          // Exactly 1 match — connect to it
          const match = matches[0];
          try {
            await ensureAccountSession(match);
          } catch (err) {
            // Login failed — do NOT set as active
            return textResult({
              error: `Matched ${match.hostname} but login failed: ${(err as Error).message}`,
              selected: null,
              accounts: accountList,
            });
          }

          // Success — set as active account
          setActiveAccount(match.hostname);
          return textResult({
            selected: {
              hostname: match.hostname,
              username: match.username,
              connected: true,
            },
            accounts: accountList.map(a => ({
              ...a,
              connected: isConnected(a.hostname),
              active: normalizeHostname(a.hostname) === normalizeHostname(match.hostname),
            })),
          });
        } catch (err) {
          return errorResult((err as Error).message);
        }
      },
    },

    // Scraper tools
    makeTool('mychart_get_profile', 'MyChart Profile', 'Get patient profile (name, DOB, MRN, PCP) and email', async (req) => {
      const profile = await getMyChartProfile(req);
      const email = await getEmail(req);
      return { ...profile, email };
    }),
    makeTool('mychart_get_health_summary', 'Health Summary', 'Get health summary (vitals, blood type, etc.)', (req) => getHealthSummary(req)),
    makeTool('mychart_get_medications', 'Medications', 'Get current medications list', (req) => getMedications(req)),
    makeTool('mychart_get_allergies', 'Allergies', 'Get allergies list', (req) => getAllergies(req)),
    makeTool('mychart_get_health_issues', 'Health Issues', 'Get health issues / active conditions', (req) => getHealthIssues(req)),
    makeTool('mychart_get_vitals', 'Vitals', 'Get vitals and track-my-health flowsheet data', (req) => getVitals(req)),
    makeTool('mychart_get_upcoming_visits', 'Upcoming Visits', 'Get upcoming appointments', (req) => upcomingVisits(req)),
    makeTool('mychart_get_past_visits', 'Past Visits', 'Get past visits (optionally specify years_back, default 2)', async (req, params) => {
      const yearsBack = (params?.years_back as number) ?? 2;
      const oldest = new Date();
      oldest.setFullYear(oldest.getFullYear() - yearsBack);
      return pastVisits(req, oldest);
    }, { type: 'object', properties: { years_back: { type: 'number', description: 'Years to look back (default 2)' } }, required: [] }),
    makeTool('mychart_get_lab_results', 'Lab Results', 'Get lab results and test details', (req) => listLabResults(req)),
    makeTool('mychart_get_imaging_results', 'Imaging Results', 'Get imaging results (X-ray, MRI, CT, etc.)', (req) => getImagingResults(req)),

    // Messages
    makeTool('mychart_get_messages', 'Messages', 'Get message conversations from communication center', (req) => listConversations(req)),
    makeTool('mychart_get_message_thread', 'Message Thread', 'Get all messages in a conversation thread', async (req, params) => {
      const id = params?.conversation_id as string;
      if (!id) throw new Error('conversation_id is required');
      return getConversationMessages(req, id);
    }, { type: 'object', properties: { conversation_id: { type: 'string', description: 'Conversation ID' } }, required: ['conversation_id'] }),
    makeTool('mychart_get_message_recipients', 'Message Recipients', 'Get providers who can receive messages', async (req) => {
      const token = await getVerificationToken(req);
      if (!token) throw new Error('Could not get verification token for message recipients');
      return getMessageRecipients(req, token);
    }),
    makeTool('mychart_get_message_topics', 'Message Topics', 'Get available message topics/categories', async (req) => {
      const token = await getVerificationToken(req);
      if (!token) throw new Error('Could not get verification token for message topics');
      return getMessageTopics(req, token);
    }),
    makeTool('mychart_send_message', 'Send Message', 'Send a new message to a provider', async (req, params) => {
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
    makeTool('mychart_send_reply', 'Reply to Message', 'Reply to an existing conversation', async (req, params) => {
      return sendReply(req, { conversationId: params.conversation_id as string, messageBody: params.message as string });
    }, {
      type: 'object',
      properties: { conversation_id: { type: 'string' }, message: { type: 'string' } },
      required: ['conversation_id', 'message'],
    }),
    makeTool('mychart_delete_message', 'Delete Message', 'Delete a message conversation', async (req, params) => {
      return deleteMessage(req, params.conversation_id as string);
    }, { type: 'object', properties: { conversation_id: { type: 'string' } }, required: ['conversation_id'] }),

    // Clinical
    makeTool('mychart_get_billing', 'Billing', 'Get billing history and account details', (req) => getBillingHistory(req)),
    makeTool('mychart_get_care_team', 'Care Team', 'Get care team members', (req) => getCareTeam(req)),
    makeTool('mychart_get_insurance', 'Insurance', 'Get insurance information', (req) => getInsurance(req)),
    makeTool('mychart_get_immunizations', 'Immunizations', 'Get immunization records', (req) => getImmunizations(req)),
    makeTool('mychart_get_preventive_care', 'Preventive Care', 'Get preventive care recommendations', (req) => getPreventiveCare(req)),
    makeTool('mychart_get_referrals', 'Referrals', 'Get referral information', (req) => getReferrals(req)),
    makeTool('mychart_get_medical_history', 'Medical History', 'Get medical history (past conditions, surgeries, family)', (req) => getMedicalHistory(req)),
    makeTool('mychart_get_letters', 'Letters', 'Get letters (after-visit summaries, clinical documents)', (req) => getLetters(req)),
    makeTool('mychart_get_documents', 'Documents', 'Get clinical documents', (req) => getDocuments(req)),
    makeTool('mychart_get_emergency_contacts', 'Emergency Contacts', 'Get emergency contacts', (req) => getEmergencyContacts(req)),
    makeTool('mychart_add_emergency_contact', 'Add Emergency Contact', 'Add a new emergency contact', async (req, params) => {
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
    makeTool('mychart_update_emergency_contact', 'Update Emergency Contact', 'Update an existing emergency contact', async (req, params) => {
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
    makeTool('mychart_remove_emergency_contact', 'Remove Emergency Contact', 'Remove an emergency contact', async (req, params) => {
      return removeEmergencyContact(req, params.id as string);
    }, {
      type: 'object',
      properties: { id: { type: 'string', description: 'Contact ID to remove (from get_emergency_contacts)' } },
      required: ['id'],
    }),
    makeTool('mychart_get_goals', 'Goals', 'Get care team and patient goals', (req) => getGoals(req)),
    makeTool('mychart_get_upcoming_orders', 'Upcoming Orders', 'Get upcoming orders (labs, imaging, procedures)', (req) => getUpcomingOrders(req)),
    makeTool('mychart_get_questionnaires', 'Questionnaires', 'Get questionnaires and health assessments', (req) => getQuestionnaires(req)),
    makeTool('mychart_get_care_journeys', 'Care Journeys', 'Get care journeys and care plans', (req) => getCareJourneys(req)),
    makeTool('mychart_get_activity_feed', 'Activity Feed', 'Get recent activity feed items', (req) => getActivityFeed(req)),
    makeTool('mychart_get_education_materials', 'Education Materials', 'Get assigned education materials', (req) => getEducationMaterials(req)),
    makeTool('mychart_get_ehi_export', 'EHI Export', 'Get electronic health information export templates', (req) => getEhiExportTemplates(req)),
    makeTool('mychart_get_linked_accounts', 'Linked Accounts', 'Get linked MyChart accounts from other organizations', (req) => getLinkedMyChartAccounts(req)),
    makeTool('mychart_request_refill', 'Request Refill', 'Request a medication refill', async (req, params) => {
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
      clearAllSessions();
      clearActiveAccount();
      api.logger.info('MyChart keepalive service stopped');
    },
  });
}
