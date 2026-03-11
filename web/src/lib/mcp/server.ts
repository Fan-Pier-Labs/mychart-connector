import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
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
import { getBillingHistory } from '../mychart/bills/bills';
import { getCareTeam } from '../mychart/careTeam';
import { getInsurance } from '../mychart/insurance';
import { getImmunizations } from '../mychart/immunizations';
import { getPreventiveCare } from '../mychart/preventiveCare';
import { getReferrals } from '../mychart/referrals';
import { getMedicalHistory } from '../mychart/medicalHistory';
import { getLetters } from '../mychart/letters';
import { getVitals } from '../mychart/vitals';
import { getEmergencyContacts } from '../mychart/emergencyContacts';
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
  const instances = await getMyChartInstances(userId);
  console.log(`[mcp] resolveRequest: found ${instances.length} instance(s): ${instances.map(i => i.hostname).join(', ')}`);
  if (instances.length === 0) {
    return { error: 'No MyChart accounts configured. Add one at the web app.' };
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

  // If none connected, try auto-connecting instances with TOTP secrets
  if (connected.length === 0) {
    const totpInstances = instances.filter(i => i.totpSecret);
    if (totpInstances.length === 0) {
      console.log(`[mcp] resolveRequest: no TOTP instances available for auto-connect`);
      return { error: 'No MyChart accounts are connected. Use the connect_instance tool or log in at the web app.' };
    }

    console.log(`[mcp] resolveRequest: auto-connecting ${totpInstances.length} TOTP instance(s): ${totpInstances.map(i => i.hostname).join(', ')}`);
    const autoConnectResults: { hostname: string; result: string }[] = [];
    for (const inst of totpInstances) {
      const result = await autoConnectInstance(userId, inst);
      autoConnectResults.push({ hostname: inst.hostname, result });
      console.log(`[mcp] resolveRequest: auto-connect ${inst.hostname} => ${result}`);
    }

    connected = getConnected();
    if (connected.length === 0) {
      const details = autoConnectResults.map(r => `${r.hostname}=${r.result}`).join(', ');
      return { error: `Auto-connect failed for all instances (${details}). Try using connect_instance or log in at the web app.` };
    }
  }

  // If hostname specified, filter to matching instance
  if (instanceHostname) {
    const match = connected.find(c => c.instance.hostname === instanceHostname);
    if (!match) {
      const available = connected.map(c => c.instance.hostname).join(', ');
      return { error: `Instance '${instanceHostname}' not found or not connected. Connected: ${available}` };
    }
    return { mychartRequest: match.request, instance: match.instance };
  }

  // If one connected, use it
  if (connected.length === 1) {
    return { mychartRequest: connected[0].request, instance: connected[0].instance };
  }

  // Multiple connected, no hostname specified
  const hostnames = connected.map(c => c.instance.hostname).join(', ');
  return { error: `Multiple MyChart accounts connected. Specify the 'instance' parameter with one of: ${hostnames}` };
}

type ScraperFn = (req: MyChartRequest) => Promise<unknown>;

function registerScraperTool(server: McpServer, userId: string, name: string, description: string, scraperFn: ScraperFn) {
  server.registerTool(
    name,
    {
      description,
      inputSchema: { instance: z.string().optional().describe('MyChart hostname (required if multiple accounts connected)') },
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore zod v3/v4 compat causes deep type recursion in MCP SDK generics
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
    name: 'mychart-health',
    version: '1.0.0',
  });

  // Meta tools
  server.tool(
    'list_accounts',
    'List all MyChart accounts and their connection status',
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

  server.registerTool(
    'connect_instance',
    {
      description: 'Connect to a MyChart instance by hostname. Auto-completes 2FA if TOTP is configured.',
      inputSchema: { instance: z.string().describe('MyChart hostname to connect to') },
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore zod v3/v4 compat causes deep type recursion in MCP SDK generics
    async (args: { instance: string }): Promise<CallToolResult> => {
      console.log(`[mcp] Tool call: connect_instance (user=${userId}, instance=${args.instance})`);
      try {
        const instances = await getMyChartInstances(userId);
        const inst = instances.find(i => i.hostname === args.instance);
        if (!inst) {
          const available = instances.map(i => i.hostname).join(', ');
          return errorResult(`Instance '${args.instance}' not found. Available: ${available}`);
        }

        console.log(`[mcp] connect_instance: attempting auto-connect to ${inst.hostname} (hasTOTP=${!!inst.totpSecret})`);
        const result = await autoConnectInstance(userId, inst);
        console.log(`[mcp] connect_instance: result=${result} for ${inst.hostname}`);
        return jsonResult({ status: result, hostname: inst.hostname });
      } catch (err) {
        const error = err as Error;
        console.error(`[mcp] connect_instance: error -`, error.message, error.stack);
        return errorResult(`Error connecting to ${args.instance}: ${error.message}`);
      }
    }
  );

  // Auth tools
  server.registerTool(
    'check_session',
    {
      description: 'Check current session status and hostname for a MyChart instance',
      inputSchema: { instance: z.string().optional().describe('MyChart hostname (checks all if omitted)') },
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore zod v3/v4 compat causes deep type recursion in MCP SDK generics
    async (args: { instance?: string }): Promise<CallToolResult> => {
      console.log(`[mcp] Tool call: check_session (user=${userId}, instance=${args.instance || 'all'})`);
      try {
        const instances = await getMyChartInstances(userId);
        console.log(`[mcp] check_session: found ${instances.length} instance(s)`);

        const toCheck = args.instance
          ? instances.filter(i => i.hostname === args.instance)
          : instances;

        if (toCheck.length === 0) {
          return errorResult(args.instance
            ? `Instance '${args.instance}' not found.`
            : 'No MyChart accounts configured.');
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
              console.log(`[mcp] check_session: ${inst.hostname} cookie validation response status=${resp.status}`);
            } catch (err) {
              console.error(`[mcp] check_session: cookie validation failed for ${inst.hostname}:`, (err as Error).message);
            }
          }

          const cookieCount = entry ? entry.request.getCookieInfo().count : 0;
          console.log(`[mcp] check_session: ${inst.hostname} — status=${entry?.status || 'none'}, ${cookieCount} cookies, valid=${cookiesValid}`);

          results.push({
            hostname: inst.hostname,
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

  server.registerTool(
    'complete_2fa',
    {
      description: 'Complete 2FA verification for a MyChart instance. Pass the 2FA code and instance hostname.',
      inputSchema: {
        code: z.string(),
        instance: z.string().describe('MyChart hostname requiring 2FA'),
      },
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore zod v3/v4 compat causes deep type recursion in MCP SDK generics
    async (args: { code: string; instance: string }): Promise<CallToolResult> => {
      console.log(`[mcp] Tool call: complete_2fa (user=${userId}, instance=${args.instance})`);
      try {
        const instances = await getMyChartInstances(userId);
        const inst = instances.find(i => i.hostname === args.instance);
        if (!inst) {
          return errorResult(`Instance '${args.instance}' not found.`);
        }

        const sessionKey = `${userId}:${inst.id}`;
        const entry = sessionStore.getEntry(sessionKey);
        if (!entry) {
          return errorResult('No pending 2FA session for this instance. Try connect_instance first.');
        }
        const req = entry.request;

        console.log(`[mcp] complete_2fa: submitting code for ${inst.hostname}`);
        const result = await complete2faFlow({ mychartRequest: req, code: args.code });
        console.log(`[mcp] complete_2fa: result state=${result.state} for ${inst.hostname}`);
        if (result.state === 'logged_in') {
          const { setSession } = await import('../sessions');
          setSession(sessionKey, result.mychartRequest, { hostname: inst.hostname });
          return jsonResult({ status: 'logged_in', message: '2FA completed successfully' });
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
  registerScraperTool(server, userId, 'get_profile', 'Get patient profile (name, DOB, MRN, PCP) and email', async (req) => {
    const profile = await getMyChartProfile(req);
    const email = await getEmail(req);
    return { ...profile, email };
  });

  registerScraperTool(server, userId, 'get_health_summary', 'Get health summary (vitals, blood type, etc.)', getHealthSummary);
  registerScraperTool(server, userId, 'get_medications', 'Get current medications list', getMedications);
  registerScraperTool(server, userId, 'get_allergies', 'Get allergies list', getAllergies);
  registerScraperTool(server, userId, 'get_health_issues', 'Get health issues / active conditions', getHealthIssues);
  registerScraperTool(server, userId, 'get_upcoming_visits', 'Get upcoming appointments', upcomingVisits);

  server.registerTool(
    'get_past_visits',
    {
      description: 'Get past visits/appointments. Optionally specify years_back (default 2).',
      inputSchema: {
        years_back: z.number().optional(),
        instance: z.string().optional().describe('MyChart hostname (required if multiple accounts connected)'),
      },
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore zod v3/v4 compat causes deep type recursion in MCP SDK generics
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

  registerScraperTool(server, userId, 'get_lab_results', 'Get lab results and test details', listLabResults);
  registerScraperTool(server, userId, 'get_messages', 'Get message conversations from communication center', listConversations);
  registerScraperTool(server, userId, 'get_billing', 'Get billing history and account details', getBillingHistory);
  registerScraperTool(server, userId, 'get_care_team', 'Get care team members', getCareTeam);
  registerScraperTool(server, userId, 'get_insurance', 'Get insurance information', getInsurance);
  registerScraperTool(server, userId, 'get_immunizations', 'Get immunization records', getImmunizations);
  registerScraperTool(server, userId, 'get_preventive_care', 'Get preventive care items and recommendations', getPreventiveCare);
  registerScraperTool(server, userId, 'get_referrals', 'Get referral information', getReferrals);
  registerScraperTool(server, userId, 'get_medical_history', 'Get medical history (past conditions, surgical history, family history)', getMedicalHistory);
  registerScraperTool(server, userId, 'get_letters', 'Get letters (after-visit summaries, clinical documents)', getLetters);
  registerScraperTool(server, userId, 'get_vitals', 'Get vitals and track-my-health flowsheet data (weight, blood pressure, etc.)', getVitals);
  registerScraperTool(server, userId, 'get_emergency_contacts', 'Get emergency contacts', getEmergencyContacts);
  registerScraperTool(server, userId, 'get_documents', 'Get clinical documents', getDocuments);
  registerScraperTool(server, userId, 'get_goals', 'Get care team and patient goals', getGoals);
  registerScraperTool(server, userId, 'get_upcoming_orders', 'Get upcoming orders (labs, imaging, procedures)', getUpcomingOrders);
  registerScraperTool(server, userId, 'get_questionnaires', 'Get questionnaires and health assessments', getQuestionnaires);
  registerScraperTool(server, userId, 'get_care_journeys', 'Get care journeys and care plans', getCareJourneys);
  registerScraperTool(server, userId, 'get_activity_feed', 'Get recent activity feed items', getActivityFeed);
  registerScraperTool(server, userId, 'get_education_materials', 'Get assigned education materials', getEducationMaterials);
  registerScraperTool(server, userId, 'get_ehi_export', 'Get electronic health information export templates', getEhiExportTemplates);
  registerScraperTool(server, userId, 'get_imaging_results', 'Get imaging results (X-ray, MRI, CT, ultrasound, etc.)', getImagingResults);
  registerScraperTool(server, userId, 'get_linked_mychart_accounts', 'Get linked MyChart accounts from other healthcare organizations', getLinkedMyChartAccounts);

  return server;
}
