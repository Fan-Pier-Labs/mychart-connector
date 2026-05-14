import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MyChartRequest } from '../mychart/myChartRequest';
import { sessionStore } from '../../../../scrapers/myChart/sessionStore';
import { sendTelemetryEvent } from '../../../../shared/telemetry';
import { getMyChartInstances, type MyChartInstance } from '../db';
import { autoConnectInstance } from './auto-connect';
import { getMyChartProfile, getEmail } from '../mychart/profile';
import { getHealthSummary } from '../mychart/healthSummary';
import { getMedications } from '../mychart/medications';
import { getAllergies } from '../mychart/allergies';
import { getHealthIssues } from '../mychart/healthIssues';
import { upcomingVisits, pastVisits } from '../mychart/visits/visits';
import { listLabResults } from '../mychart/labs/labResults';
import { listConversations } from '../mychart/messages/conversations';
import { sendNewMessage, getMessageTopics, getMessageRecipients, getVerificationToken } from '../mychart/messages/sendMessage';
import type { MessageRecipient, MessageTopic } from '../mychart/messages/sendMessage';
import { sendReply } from '../mychart/messages/sendReply';
import { requestMedicationRefill } from '../mychart/medicationRefill';
import { getBillingHistory } from '../mychart/bills/bills';
import { getCareTeam } from '../mychart/careTeam';
import { getInsurance } from '../mychart/insurance';
import { getImmunizations } from '../mychart/immunizations';
import { getPreventiveCare } from '../mychart/preventiveCare';
import { getReferrals } from '../mychart/referrals';
import { getMedicalHistory } from '../mychart/medicalHistory';
import { getLetters } from '../mychart/letters';
import { getVisitNotes, getNoteContent, getVisitAVS } from '../mychart/notes/notes';
import { getVitals } from '../mychart/vitals';
import { getEmergencyContacts, addEmergencyContact, updateEmergencyContact, removeEmergencyContact } from '../mychart/emergencyContacts';
import { getDocuments } from '../mychart/documents';
import { getGoals } from '../mychart/goals';
import { getUpcomingOrders } from '../mychart/upcomingOrders';
import { getQuestionnaires } from '../mychart/questionnaires';
import { getCareJourneys } from '../mychart/careJourneys';
import { getActivityFeed } from '../mychart/activityFeed';
import { getEducationMaterials } from '../mychart/educationMaterials';
import { getEhiExportTemplates } from '../mychart/ehiExport';
import { getImagingResults } from '../mychart/imagingResults';
import { getLinkedMyChartAccounts } from '../mychart/linkedMyChartAccounts';
import { complete2faFlow } from '../mychart/login';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { trimLabResults, trimBilling, trimMessages, trimImagingResults, trimLinkedAccounts, paginate } from './transforms';
import type { LabTestResultWithHistory, ImagingResult } from '../../../../scrapers/myChart/labs_and_procedure_results/labtestresulttype';
import type { BillingAccount } from '../../../../scrapers/myChart/bills/types';
import type { ConversationListResponse } from '../../../../scrapers/myChart/messages/conversations';
import type { LinkedMyChart } from '../../../../scrapers/myChart/other_mycharts/other_mycharts';
import { toolDef } from './tool-definitions';

function errorResult(message: string): CallToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

function jsonResult(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

/**
 * Resolve a MyChartRequest for a user, optionally filtering by instance hostname.
 * If no instances are connected, tries auto-connecting TOTP-enabled instances.
 */
async function resolveRequest(
  userId: string,
  instanceHostname?: string
): Promise<{ mychartRequest: MyChartRequest; instance: MyChartInstance } | { error: string }> {
  console.log(`[mcp] resolveRequest: userId=${userId}, instanceHostname=${instanceHostname || 'auto'}`);
  // Dump entire session store to see what's actually in it
  const allStoreEntries = Array.from(sessionStore.all().entries());
  console.log(`[mcp] resolveRequest: store has ${allStoreEntries.length} entries: ${allStoreEntries.map(([k, e]) => `${k}=${e.status}`).join(', ') || 'none'}`);
  const allInstances = await getMyChartInstances(userId);
  const instances = allInstances.filter(i => i.enabled);
  console.log(`[mcp] resolveRequest: found ${allInstances.length} instance(s), ${instances.length} enabled: ${instances.map(i => `${i.hostname}(id=${i.id})`).join(', ')}`);

  if (instances.length === 0) {
    return { error: allInstances.length > 0
      ? 'All MyChart accounts are disabled. Enable one at the web app.'
      : 'No MyChart accounts configured. Add one at the web app.' };
  }

  // Find connected instances (only logged_in status, not need_2fa or expired)
  function getConnected(): { instance: MyChartInstance; request: MyChartRequest }[] {
    const connected: { instance: MyChartInstance; request: MyChartRequest }[] = [];
    for (const inst of instances) {
      const sessionKey = `${userId}:${inst.id}`;
      const entry = sessionStore.getEntry(sessionKey);
      const status = entry ? entry.status : 'no-session';
      console.log(`[mcp] resolveRequest: ${inst.hostname} (${inst.id}) session=${status}`);
      if (entry && entry.status === 'logged_in') {
        connected.push({ instance: inst, request: entry.request });
      }
    }
    return connected;
  }

  let connected = getConnected();
  console.log(`[mcp] resolveRequest: ${connected.length} connected instance(s)`);

  // If a 2FA flow is in progress, don't auto-connect (which would wipe the pending session).
  // The user must call complete_2fa first. List ALL pending instances with hostname:username
  // so the caller can target the right account when multiple accounts share a hostname.
  if (connected.length === 0) {
    const pending2fa = instances.filter(inst => {
      const entry = sessionStore.getEntry(`${userId}:${inst.id}`);
      return entry?.status === 'need_2fa';
    });
    if (pending2fa.length > 0) {
      const labels = pending2fa.map(i => `${i.hostname}:${i.username}`);
      console.log(`[mcp] resolveRequest: ${labels.join(', ')} pending 2FA — skipping auto-connect`);
      return { error: `MyChart is waiting for 2FA on: ${labels.join(', ')}. Use the complete_2fa tool with instance set to one of these to enter your code.` };
    }
  }

  // If none connected, try auto-connecting all instances.
  // TOTP instances can be fully auto-completed; non-TOTP instances may succeed if the
  // site doesn't require 2FA, or will return need_2fa prompting the user to complete it.
  if (connected.length === 0) {
    console.log(`[mcp] resolveRequest: auto-connecting ${instances.length} instance(s): ${instances.map(i => i.hostname).join(', ')}`);
    const autoConnectResults: { hostname: string; result: string }[] = [];
    for (const inst of instances) {
      const result = await autoConnectInstance(userId, inst);
      autoConnectResults.push({ hostname: inst.hostname, result: result.state });
      console.log(`[mcp] resolveRequest: auto-connect ${inst.hostname} => ${result.state}`);
    }

    connected = getConnected();
    if (connected.length === 0) {
      const details = autoConnectResults.map(r => `${r.hostname}=${r.result}`).join(', ');
      const needs2fa = autoConnectResults.some(r => r.result === 'need_2fa');
      if (needs2fa) {
        return { error: `MyChart requires 2FA. Use the complete_2fa tool to enter your code, or log in at the web app. (${details})` };
      }
      return { error: `Auto-connect failed for all instances (${details}). Try using connect_instance or log in at the web app.` };
    }
  }

  // Match the requested instance against the connected pool.
  const match = pickInstance(connected, instanceHostname);
  if ('matchIndex' in match) {
    return { mychartRequest: connected[match.matchIndex].request, instance: connected[match.matchIndex].instance };
  }
  return { error: match.error };
}

/**
 * Pure logic for selecting one item from a list given a user-supplied instance
 * identifier. Exported for unit testing.
 *
 * The instance identifier can be either:
 *   - a bare hostname (e.g. "mychart.example.org" or "mychart.example.org:8443"
 *     when normalizeHostname has appended a port), matching exactly one item, OR
 *   - "hostname:username" to disambiguate when multiple items share a hostname.
 *
 * Exact hostname match is tried first so port-suffixed hostnames keep working.
 * Falls back to hostname:username parsing (using lastIndexOf so "host:8443:alice"
 * still resolves) only if no exact match exists.
 *
 * `accessor` extracts {hostname, username} from each item; this makes the helper
 * usable for both 'connected sessions' and 'configured instances' lookups.
 */
export function pickByInstanceIdentifier<T>(
  items: T[],
  instanceHostname: string | undefined,
  accessor: (item: T) => { hostname: string; username: string },
  notFoundContext: 'connected' | 'configured' = 'connected'
): { matchIndex: number } | { error: string } {
  const labelAll = () => items.map(i => {
    const a = accessor(i);
    return `${a.hostname}:${a.username}`;
  }).join(', ');

  if (instanceHostname) {
    // 1. Exact hostname match (preserves port-suffixed hostnames).
    const exactIndices = items.flatMap((it, i) => accessor(it).hostname === instanceHostname ? [i] : []);
    if (exactIndices.length === 1) {
      return { matchIndex: exactIndices[0] };
    }
    if (exactIndices.length > 1) {
      const labels = exactIndices.map(i => {
        const a = accessor(items[i]);
        return `${a.hostname}:${a.username}`;
      }).join(', ');
      return { error: `Multiple accounts on hostname '${instanceHostname}'. Specify the 'instance' parameter as 'hostname:username', one of: ${labels}` };
    }

    // 2. No exact match — try hostname:username syntax. Split on LAST colon so
    //    a port-suffixed hostname like "host:8443" with username "alice" can be
    //    written "host:8443:alice".
    const colonIdx = instanceHostname.lastIndexOf(':');
    if (colonIdx > 0 && colonIdx < instanceHostname.length - 1) {
      const hostnamePart = instanceHostname.slice(0, colonIdx);
      const usernamePart = instanceHostname.slice(colonIdx + 1);
      const matchedIndex = items.findIndex(it => {
        const a = accessor(it);
        return a.hostname === hostnamePart && a.username === usernamePart;
      });
      if (matchedIndex >= 0) {
        return { matchIndex: matchedIndex };
      }
    }

    // 3. Not found.
    const suffix = notFoundContext === 'connected' ? 'Connected' : 'Available';
    return { error: `Instance '${instanceHostname}' not found or not ${notFoundContext}. ${suffix}: ${labelAll()}` };
  }

  // No instance specified.
  if (items.length === 1) {
    return { matchIndex: 0 };
  }
  const suffix = notFoundContext === 'connected' ? 'Connected' : 'Available';
  return { error: `Multiple MyChart accounts ${notFoundContext}. Specify the 'instance' parameter (hostname or hostname:username) with one of: ${labelAll()}` };
}

/** Convenience wrapper for the connected-session resolver. */
export function pickInstance(
  connected: { instance: { hostname: string; username: string } }[],
  instanceHostname: string | undefined
): { matchIndex: number } | { error: string } {
  return pickByInstanceIdentifier(connected, instanceHostname, c => c.instance, 'connected');
}

type ScraperFn = (req: MyChartRequest) => Promise<unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function registerScraperTool(server: McpServer, userId: string, reg: (name: string, handler: (...args: any[]) => Promise<CallToolResult>) => void, name: string, scraperFn: ScraperFn) {
  reg(name,
    async (args: { instance?: string }): Promise<CallToolResult> => {
      sendTelemetryEvent('mcp_tool_called', { tool_name: name });
      console.log(`[mcp] Tool call: ${name} (user=${userId}, instance=${args.instance || 'auto'})`);
      try {
        const result = await resolveRequest(userId, args.instance);
        if ('error' in result) {
          console.log(`[mcp] Tool ${name}: resolve error - ${result.error}`);
          return errorResult(result.error);
        }

        const infoBefore = result.mychartRequest.getCookieInfo();
        console.log(`[mcp] Tool ${name}: starting with ${infoBefore.count} cookies (${result.instance.hostname})`);

        const data = await scraperFn(result.mychartRequest);
        const resultStr = JSON.stringify(data);
        const isEmpty = resultStr === '{}' || resultStr === '[]' || resultStr === 'null';
        console.log(`[mcp] Tool ${name}: success (${resultStr.length} chars${isEmpty ? ', WARNING: empty' : ''})`);
        return jsonResult(data);
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] Tool ${name}: error -`, error.message, error.stack);
        return errorResult(`Error fetching ${name}: ${error.message}`);
      }
    }
  );
}

export function createMcpServer(userId: string): McpServer {
  sendTelemetryEvent('mcp_server_created');
  const server = new McpServer({
    name: 'openrecord',
    version: '1.0.0',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function reg(name: string, handler: (...args: any[]) => Promise<CallToolResult>) {
    const def = toolDef(name);
    server.registerTool(
      name,
      { description: def.description, inputSchema: def.inputSchema },
      // @ts-expect-error zod v3/v4 compat
      handler
    );
  }

  // Meta tools
  reg('list_accounts',
    async (): Promise<CallToolResult> => {
      console.log(`[mcp] Tool call: list_accounts (user=${userId})`);
      try {
        const instances = await getMyChartInstances(userId);
        console.log(`[mcp] list_accounts: found ${instances.length} instance(s)`);
        const accounts = instances.map(inst => {
          const sessionKey = `${userId}:${inst.id}`;
          const entry = sessionStore.getEntry(sessionKey);
          return {
            hostname: inst.hostname,
            username: inst.username,
            connected: !!entry && entry.status === 'logged_in',
            hasTotpSecret: !!inst.totpSecret,
            hasPasskeyCredential: !!inst.passkeyCredential,
            enabled: inst.enabled,
          };
        });
        return jsonResult(accounts);
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] list_accounts: error -`, error.message, error.stack);
        return errorResult(`Error listing accounts: ${error.message}`);
      }
    }
  );

  reg('connect_instance',
    async (args: { instance: string }): Promise<CallToolResult> => {
      console.log(`[mcp] Tool call: connect_instance (user=${userId}, instance=${args.instance})`);
      try {
        const instances = await getMyChartInstances(userId);
        const pick = pickByInstanceIdentifier(instances, args.instance, i => ({ hostname: i.hostname, username: i.username }), 'configured');
        if ('error' in pick) return errorResult(pick.error);
        const inst = instances[pick.matchIndex];

        console.log(`[mcp] connect_instance: attempting auto-connect to ${inst.hostname}:${inst.username} (hasTOTP=${!!inst.totpSecret})`);
        const result = await autoConnectInstance(userId, inst);
        console.log(`[mcp] connect_instance: result=${result.state} for ${inst.hostname}:${inst.username}`);
        return jsonResult({ status: result.state, hostname: inst.hostname, username: inst.username });
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] connect_instance: error -`, error.message, error.stack);
        return errorResult(`Error connecting to ${args.instance}: ${error.message}`);
      }
    }
  );

  // Auth tools
  reg('check_session',
    async (args: { instance?: string }): Promise<CallToolResult> => {
      console.log(`[mcp] Tool call: check_session (user=${userId}, instance=${args.instance || 'all'})`);
      try {
        const instances = await getMyChartInstances(userId);
        console.log(`[mcp] check_session: found ${instances.length} instance(s)`);

        let toCheck: typeof instances;
        if (args.instance) {
          const pick = pickByInstanceIdentifier(instances, args.instance, i => ({ hostname: i.hostname, username: i.username }), 'configured');
          if ('error' in pick) return errorResult(pick.error);
          toCheck = [instances[pick.matchIndex]];
        } else {
          toCheck = instances;
        }

        if (toCheck.length === 0) {
          return errorResult('No MyChart accounts configured.');
        }

        const results = [];
        for (const inst of toCheck) {
          const sessionKey = `${userId}:${inst.id}`;
          const entry = sessionStore.getEntry(sessionKey);
          let cookiesValid = false;

          if (entry && entry.status === 'logged_in') {
            try {
              const resp = await entry.request.makeRequest({ path: '/Home', followRedirects: false });
              cookiesValid = resp.status === 200;
              console.log(`[mcp] check_session: ${inst.hostname}:${inst.username} cookie validation response status=${resp.status}`);
            } catch (err) {
              console.error(`[mcp] check_session: cookie validation failed for ${inst.hostname}:${inst.username}:`, (err as Error).message);
            }
          }

          const cookieCount = entry ? entry.request.getCookieInfo().count : 0;
          console.log(`[mcp] check_session: ${inst.hostname}:${inst.username} — status=${entry?.status || 'none'}, ${cookieCount} cookies, valid=${cookiesValid}`);

          results.push({
            hostname: inst.hostname,
            username: inst.username,
            connected: !!entry && entry.status === 'logged_in',
            cookiesValid,
          });
        }

        return jsonResult(results.length === 1 ? results[0] : results);
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] check_session: error -`, error.message, error.stack);
        return errorResult(`Error checking session: ${error.message}`);
      }
    }
  );

  reg('complete_2fa',
    async (args: { code: string; instance: string }): Promise<CallToolResult> => {
      console.log(`[mcp] Tool call: complete_2fa (user=${userId}, instance=${args.instance})`);
      try {
        const instances = await getMyChartInstances(userId);
        const pick = pickByInstanceIdentifier(instances, args.instance, i => ({ hostname: i.hostname, username: i.username }), 'configured');
        if ('error' in pick) return errorResult(pick.error);
        const inst = instances[pick.matchIndex];

        const sessionKey = `${userId}:${inst.id}`;
        console.log(`[mcp] complete_2fa: sessionKey=${sessionKey}`);
        const entry = sessionStore.getEntry(sessionKey);
        const storeKeys = Array.from(sessionStore.all().entries()).map(([k, e]) => `${k}=${e.status}`).join(', ');
        console.log(`[mcp] complete_2fa: store state BEFORE: [${storeKeys || 'empty'}]`);
        if (!entry) {
          return errorResult('No pending 2FA session for this instance. Try connect_instance first.');
        }
        const req = entry.request;

        console.log(`[mcp] complete_2fa: submitting code for ${inst.hostname}:${inst.username}`);
        const result = await complete2faFlow({ mychartRequest: req, code: args.code });
        console.log(`[mcp] complete_2fa: result state=${result.state} for ${inst.hostname}:${inst.username}`);
        if (result.state === 'logged_in') {
          const { setSession } = await import('../sessions');
          setSession(sessionKey, result.mychartRequest, { hostname: inst.hostname });
          const storeKeysAfter = Array.from(sessionStore.all().entries()).map(([k, e]) => `${k}=${e.status}`).join(', ');
          console.log(`[mcp] complete_2fa: store state AFTER setSession: [${storeKeysAfter}]`);
          return jsonResult({ status: 'logged_in', message: '2FA completed successfully', hostname: inst.hostname, username: inst.username });
        }
        return errorResult(`2FA failed: ${result.state}`);
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] complete_2fa: error -`, error.message, error.stack);
        return errorResult(`2FA error: ${error.message}`);
      }
    }
  );

  // Scraper tools
  registerScraperTool(server, userId, reg,'get_profile', async (req) => {
    const profile = await getMyChartProfile(req);
    const email = await getEmail(req);
    return { ...profile, email };
  });

  registerScraperTool(server, userId, reg,'get_health_summary', getHealthSummary);
  registerScraperTool(server, userId, reg,'get_medications', getMedications);
  registerScraperTool(server, userId, reg,'get_allergies', getAllergies);
  registerScraperTool(server, userId, reg,'get_health_issues', getHealthIssues);
  registerScraperTool(server, userId, reg,'get_upcoming_visits', upcomingVisits);

  reg('get_past_visits',
    async (args: { years_back?: number; instance?: string }): Promise<CallToolResult> => {
      console.log(`[mcp] Tool call: get_past_visits (user=${userId}, instance=${args.instance || 'auto'})`);
      try {
        const result = await resolveRequest(userId, args.instance);
        if ('error' in result) return errorResult(result.error);
        const oldest = new Date();
        oldest.setFullYear(oldest.getFullYear() - (args.years_back ?? 2));
        const data = await pastVisits(result.mychartRequest, oldest);
        return jsonResult(data);
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] get_past_visits: error -`, error.message, error.stack);
        return errorResult(`Error fetching past visits: ${error.message}`);
      }
    }
  );

  // List clinical notes attached to a past visit
  reg('get_visit_notes',
    async (args: { csn: string; instance?: string }): Promise<CallToolResult> => {
      sendTelemetryEvent('mcp_tool_called', { tool_name: 'get_visit_notes' });
      // Don't log the CSN - it's a clinical encounter identifier.
      console.log(`[mcp] Tool call: get_visit_notes (user=${userId}, instance=${args.instance || 'auto'})`);
      try {
        const result = await resolveRequest(userId, args.instance);
        if ('error' in result) return errorResult(result.error);
        const data = await getVisitNotes(result.mychartRequest, args.csn);
        return jsonResult(data);
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] get_visit_notes: error -`, error.message, error.stack);
        return errorResult(`Error fetching visit notes: ${error.message}`);
      }
    }
  );

  // Fetch the rendered HTML content of a single clinical note
  reg('get_note_content',
    async (args: { csn: string; lrp_id: string; hno_id: string; hno_dat: string; instance?: string }): Promise<CallToolResult> => {
      sendTelemetryEvent('mcp_tool_called', { tool_name: 'get_note_content' });
      // Don't log the CSN or HNO ID - they're clinical encounter/note identifiers.
      console.log(`[mcp] Tool call: get_note_content (user=${userId}, instance=${args.instance || 'auto'})`);
      try {
        const result = await resolveRequest(userId, args.instance);
        if ('error' in result) return errorResult(result.error);
        const data = await getNoteContent(result.mychartRequest, {
          csn: args.csn,
          lrpId: args.lrp_id,
          hnoId: args.hno_id,
          hnoDat: args.hno_dat,
        });
        return jsonResult(data);
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] get_note_content: error -`, error.message, error.stack);
        return errorResult(`Error fetching note content: ${error.message}`);
      }
    }
  );

  // Fetch the After Visit Summary (AVS) HTML for a past visit
  reg('get_visit_avs',
    async (args: { csn: string; instance?: string }): Promise<CallToolResult> => {
      sendTelemetryEvent('mcp_tool_called', { tool_name: 'get_visit_avs' });
      // Don't log the CSN - it's a clinical encounter identifier.
      console.log(`[mcp] Tool call: get_visit_avs (user=${userId}, instance=${args.instance || 'auto'})`);
      try {
        const result = await resolveRequest(userId, args.instance);
        if ('error' in result) return errorResult(result.error);
        const data = await getVisitAVS(result.mychartRequest, args.csn);
        return jsonResult(data);
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] get_visit_avs: error -`, error.message, error.stack);
        return errorResult(`Error fetching visit AVS: ${error.message}`);
      }
    }
  );

  // Lab results — trimmed + paginated
  reg('get_lab_results',
    async (args: { instance?: string; limit?: number; offset?: number }): Promise<CallToolResult> => {
      console.log(`[mcp] Tool call: get_lab_results (user=${userId}, instance=${args.instance || 'auto'})`);
      try {
        const result = await resolveRequest(userId, args.instance);
        if ('error' in result) return errorResult(result.error);
        const raw = await listLabResults(result.mychartRequest) as LabTestResultWithHistory[];
        const trimmed = trimLabResults(raw);
        const page = paginate(trimmed, args.limit ?? 10, args.offset);
        return jsonResult({ total: trimmed.length, offset: args.offset ?? 0, count: page.length, results: page });
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] get_lab_results: error -`, error.message, error.stack);
        return errorResult(`Error fetching get_lab_results: ${error.message}`);
      }
    }
  );

  // Messages — trimmed + paginated
  reg('get_messages',
    async (args: { instance?: string; limit?: number; offset?: number }): Promise<CallToolResult> => {
      console.log(`[mcp] Tool call: get_messages (user=${userId}, instance=${args.instance || 'auto'})`);
      try {
        const result = await resolveRequest(userId, args.instance);
        if ('error' in result) return errorResult(result.error);
        const raw = await listConversations(result.mychartRequest) as ConversationListResponse | null;
        const trimmed = trimMessages(raw);
        const page = paginate(trimmed, args.limit ?? 10, args.offset);
        return jsonResult({ total: trimmed.length, offset: args.offset ?? 0, count: page.length, conversations: page });
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] get_messages: error -`, error.message, error.stack);
        return errorResult(`Error fetching get_messages: ${error.message}`);
      }
    }
  );

  // Message recipients + topics
  reg('get_message_recipients',
    async (args: { instance?: string }): Promise<CallToolResult> => {
      sendTelemetryEvent('mcp_tool_called', { tool_name: 'get_message_recipients' });
      console.log(`[mcp] Tool call: get_message_recipients (user=${userId}, instance=${args.instance || 'auto'})`);
      try {
        const result = await resolveRequest(userId, args.instance);
        if ('error' in result) return errorResult(result.error);
        const token = await getVerificationToken(result.mychartRequest);
        if (!token) return errorResult('Could not get verification token');
        const [recipients, topics] = await Promise.all([
          getMessageRecipients(result.mychartRequest, token),
          getMessageTopics(result.mychartRequest, token),
        ]);
        return jsonResult({ recipients, topics });
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] get_message_recipients: error -`, error.message, error.stack);
        return errorResult(`Error fetching message recipients: ${error.message}`);
      }
    }
  );

  // Send new message
  reg('send_message',
    async (args: { instance?: string; recipient_name: string; topic: string; subject: string; message_body: string }): Promise<CallToolResult> => {
      sendTelemetryEvent('mcp_tool_called', { tool_name: 'send_message' });
      console.log(`[mcp] Tool call: send_message (user=${userId}, instance=${args.instance || 'auto'})`);
      try {
        const result = await resolveRequest(userId, args.instance);
        if ('error' in result) return errorResult(result.error);
        const token = await getVerificationToken(result.mychartRequest);
        if (!token) return errorResult('Could not get verification token');

        const [recipients, topics] = await Promise.all([
          getMessageRecipients(result.mychartRequest, token),
          getMessageTopics(result.mychartRequest, token),
        ]);

        // Fuzzy-match recipient by case-insensitive includes
        const recipientQuery = args.recipient_name.toLowerCase();
        const matchedRecipients = recipients.filter((r: MessageRecipient) =>
          r.displayName.toLowerCase().includes(recipientQuery)
        );
        if (matchedRecipients.length === 0) {
          const available = recipients.map((r: MessageRecipient) => r.displayName).join(', ');
          return errorResult(`No recipient matching "${args.recipient_name}". Available: ${available}`);
        }
        if (matchedRecipients.length > 1) {
          const matches = matchedRecipients.map((r: MessageRecipient) => r.displayName).join(', ');
          return errorResult(`Multiple recipients match "${args.recipient_name}": ${matches}. Please be more specific.`);
        }
        const recipient = matchedRecipients[0];

        // Fuzzy-match topic, default to first if no match
        const topicQuery = args.topic.toLowerCase();
        let matchedTopic = topics.find((t: MessageTopic) =>
          t.displayName.toLowerCase().includes(topicQuery)
        );
        if (!matchedTopic && topics.length > 0) {
          matchedTopic = topics[0];
        }
        if (!matchedTopic) {
          return errorResult('No message topics available');
        }

        const sendResult = await sendNewMessage(result.mychartRequest, {
          recipient,
          topic: matchedTopic,
          subject: args.subject,
          messageBody: args.message_body,
        });

        return jsonResult(sendResult);
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] send_message: error -`, error.message, error.stack);
        return errorResult(`Error sending message: ${error.message}`);
      }
    }
  );

  // Send reply to existing conversation
  reg('send_reply',
    async (args: { instance?: string; conversation_id: string; message_body: string }): Promise<CallToolResult> => {
      sendTelemetryEvent('mcp_tool_called', { tool_name: 'send_reply' });
      console.log(`[mcp] Tool call: send_reply (user=${userId}, instance=${args.instance || 'auto'})`);
      try {
        const result = await resolveRequest(userId, args.instance);
        if ('error' in result) return errorResult(result.error);
        const replyResult = await sendReply(result.mychartRequest, {
          conversationId: args.conversation_id,
          messageBody: args.message_body,
        });
        return jsonResult(replyResult);
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] send_reply: error -`, error.message, error.stack);
        return errorResult(`Error sending reply: ${error.message}`);
      }
    }
  );

  // Request medication refill
  reg('request_refill',
    async (args: { instance?: string; medication_name: string }): Promise<CallToolResult> => {
      sendTelemetryEvent('mcp_tool_called', { tool_name: 'request_refill' });
      console.log(`[mcp] Tool call: request_refill (user=${userId}, instance=${args.instance || 'auto'})`);
      try {
        const result = await resolveRequest(userId, args.instance);
        if ('error' in result) return errorResult(result.error);

        // Get medications to find the matching one
        const medsResult = await getMedications(result.mychartRequest);
        const meds = medsResult.medications;
        const query = args.medication_name.toLowerCase();
        const matched = meds.filter(m =>
          m.name.toLowerCase().includes(query) || m.commonName.toLowerCase().includes(query)
        );

        if (matched.length === 0) {
          const available = meds.map(m => m.name).join(', ');
          return errorResult(`No medication matching "${args.medication_name}". Available: ${available}`);
        }
        if (matched.length > 1) {
          const names = matched.map(m => m.name).join(', ');
          return errorResult(`Multiple medications match "${args.medication_name}": ${names}. Please be more specific.`);
        }

        const med = matched[0];
        if (!med.isRefillable) {
          return errorResult(`"${med.name}" is not refillable.`);
        }
        if (!med.medicationKey) {
          return errorResult(`"${med.name}" does not have a medication key for refill requests.`);
        }

        const refillResult = await requestMedicationRefill(result.mychartRequest, med.medicationKey);
        return jsonResult({ ...refillResult, medication: med.name });
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] request_refill: error -`, error.message, error.stack);
        return errorResult(`Error requesting refill: ${error.message}`);
      }
    }
  );

  // Billing — trimmed + paginated
  reg('get_billing',
    async (args: { instance?: string; limit?: number; offset?: number }): Promise<CallToolResult> => {
      console.log(`[mcp] Tool call: get_billing (user=${userId}, instance=${args.instance || 'auto'})`);
      try {
        const result = await resolveRequest(userId, args.instance);
        if ('error' in result) return errorResult(result.error);
        const raw = await getBillingHistory(result.mychartRequest) as BillingAccount[];
        const trimmed = trimBilling(raw);
        // Paginate visits within each account
        const paginated = trimmed.map(acct => ({
          ...acct,
          totalVisits: acct.visits.length,
          visits: paginate(acct.visits, args.limit ?? 10, args.offset),
        }));
        return jsonResult(paginated);
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] get_billing: error -`, error.message, error.stack);
        return errorResult(`Error fetching get_billing: ${error.message}`);
      }
    }
  );
  registerScraperTool(server, userId, reg,'get_care_team', getCareTeam);
  registerScraperTool(server, userId, reg,'get_insurance', getInsurance);
  registerScraperTool(server, userId, reg,'get_immunizations', getImmunizations);
  registerScraperTool(server, userId, reg,'get_preventive_care', getPreventiveCare);
  registerScraperTool(server, userId, reg,'get_referrals', getReferrals);
  registerScraperTool(server, userId, reg,'get_medical_history', getMedicalHistory);
  registerScraperTool(server, userId, reg,'get_letters', getLetters);
  registerScraperTool(server, userId, reg,'get_vitals', getVitals);
  registerScraperTool(server, userId, reg,'get_emergency_contacts', getEmergencyContacts);

  reg('add_emergency_contact',
    async (args: { name: string; relationship_type: string; phone_number: string; instance?: string }): Promise<CallToolResult> => {
      sendTelemetryEvent('mcp_tool_called', { tool_name: 'add_emergency_contact' });
      console.log(`[mcp] Tool call: add_emergency_contact (user=${userId}, instance=${args.instance || 'auto'})`);
      try {
        const result = await resolveRequest(userId, args.instance);
        if ('error' in result) return errorResult(result.error);
        const data = await addEmergencyContact(result.mychartRequest, {
          name: args.name,
          relationshipType: args.relationship_type,
          phoneNumber: args.phone_number,
        });
        return jsonResult(data);
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] add_emergency_contact: error -`, error.message, error.stack);
        return errorResult(`Error adding emergency contact: ${error.message}`);
      }
    }
  );

  reg('update_emergency_contact',
    async (args: { id: string; name?: string; relationship_type?: string; phone_number?: string; instance?: string }): Promise<CallToolResult> => {
      sendTelemetryEvent('mcp_tool_called', { tool_name: 'update_emergency_contact' });
      console.log(`[mcp] Tool call: update_emergency_contact (user=${userId}, instance=${args.instance || 'auto'})`);
      try {
        const result = await resolveRequest(userId, args.instance);
        if ('error' in result) return errorResult(result.error);
        const data = await updateEmergencyContact(result.mychartRequest, {
          id: args.id,
          name: args.name,
          relationshipType: args.relationship_type,
          phoneNumber: args.phone_number,
        });
        return jsonResult(data);
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] update_emergency_contact: error -`, error.message, error.stack);
        return errorResult(`Error updating emergency contact: ${error.message}`);
      }
    }
  );

  reg('remove_emergency_contact',
    async (args: { id: string; instance?: string }): Promise<CallToolResult> => {
      sendTelemetryEvent('mcp_tool_called', { tool_name: 'remove_emergency_contact' });
      console.log(`[mcp] Tool call: remove_emergency_contact (user=${userId}, instance=${args.instance || 'auto'})`);
      try {
        const result = await resolveRequest(userId, args.instance);
        if ('error' in result) return errorResult(result.error);
        const data = await removeEmergencyContact(result.mychartRequest, args.id);
        return jsonResult(data);
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] remove_emergency_contact: error -`, error.message, error.stack);
        return errorResult(`Error removing emergency contact: ${error.message}`);
      }
    }
  );

  registerScraperTool(server, userId, reg,'get_documents', getDocuments);
  registerScraperTool(server, userId, reg,'get_goals', getGoals);
  registerScraperTool(server, userId, reg,'get_upcoming_orders', getUpcomingOrders);
  registerScraperTool(server, userId, reg,'get_questionnaires', getQuestionnaires);
  registerScraperTool(server, userId, reg,'get_care_journeys', getCareJourneys);
  registerScraperTool(server, userId, reg,'get_activity_feed', getActivityFeed);
  registerScraperTool(server, userId, reg,'get_education_materials', getEducationMaterials);
  registerScraperTool(server, userId, reg,'get_ehi_export', getEhiExportTemplates);
  // Imaging — trimmed (strips report HTML, keeps impression text)
  reg('get_imaging_results',
    async (args: { instance?: string; limit?: number; offset?: number }): Promise<CallToolResult> => {
      console.log(`[mcp] Tool call: get_imaging_results (user=${userId}, instance=${args.instance || 'auto'})`);
      try {
        const result = await resolveRequest(userId, args.instance);
        if ('error' in result) return errorResult(result.error);
        const raw = await getImagingResults(result.mychartRequest) as ImagingResult[];
        const trimmed = trimImagingResults(raw);
        const page = paginate(trimmed, args.limit ?? 10, args.offset);
        return jsonResult({ total: trimmed.length, offset: args.offset ?? 0, count: page.length, results: page });
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] get_imaging_results: error -`, error.message, error.stack);
        return errorResult(`Error fetching get_imaging_results: ${error.message}`);
      }
    }
  );

  // Get available appointment slots
  reg('get_available_appointments',
    async (_args: { instance?: string; provider_name?: string; visit_type?: string }): Promise<CallToolResult> => {
      sendTelemetryEvent('mcp_tool_called', { tool_name: 'get_available_appointments' });
      return errorResult('Appointment scheduling is not yet available for real MyChart instances. This feature is coming soon.');
    }
  );

  // Book appointment
  reg('book_appointment',
    async (_args: { instance?: string; slot_id: string; reason?: string }): Promise<CallToolResult> => {
      sendTelemetryEvent('mcp_tool_called', { tool_name: 'book_appointment' });
      return errorResult('Appointment booking is not yet available for real MyChart instances. This feature is coming soon.');
    }
  );

  // Linked accounts — trimmed (drops logo URLs)
  registerScraperTool(server, userId, reg,'get_linked_mychart_accounts', async (req) => {
    const raw = await getLinkedMyChartAccounts(req) as LinkedMyChart[];
    return trimLinkedAccounts(raw);
  });

  return server;
}
