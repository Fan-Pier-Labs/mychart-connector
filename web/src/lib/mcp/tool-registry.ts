import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MyChartRequest } from '../mychart/myChartRequest';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toolDef } from './tool-definitions';
import { 
  trimLabResults, 
  trimBilling, 
  trimMessages, 
  trimImagingResults, 
  trimLinkedAccounts, 
  paginate 
} from './transforms';

// Scrapers
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

// Imaging direct download
import { getRequestVerificationToken as getImagingToken } from '../../../../scrapers/myChart/labs_and_procedure_results/labResults';
import { getReportContentForImaging, extractFdiContext } from '../../../../scrapers/myChart/eunity/imagingViewer';
import { initEunitySession, downloadSingleImage } from '../../../../scrapers/myChart/eunity/imagingDirectDownload';
import { convertCloToBitmap16, applyVoiLut, to8bit, parseWrapper } from '../../../../scrapers/myChart/clo-image-parser/clo_to_bitmap';

// Types
import type { LabTestResultWithHistory, ImagingResult } from '../../../../scrapers/myChart/labs_and_procedure_results/labtestresulttype';
import type { BillingAccount } from '../../../../scrapers/myChart/bills/types';
import type { ConversationListResponse } from '../../../../scrapers/myChart/messages/conversations';
import type { LinkedMyChart } from '../../../../scrapers/myChart/other_mycharts/other_mycharts';

export type { MyChartRequest } from '../mychart/myChartRequest';

export interface MyChartInstanceInfo {
  hostname: string;
  username: string;
}

/**
 * Injectable logger interface for MCP tools.
 * 
 * WHY THIS EXISTS:
 * MCP servers communicate over standard I/O (stdio). In this mode, the protocol (JSON-RPC)
 * uses `stdout`. If any part of the code (including 3rd party libraries) calls `console.log`,
 * it writes to `stdout`, corrupts the JSON stream, and causes Claude to disconnect.
 * 
 * STRATEGY:
 * 1. Web Environment: Uses `WebConsoleLogger` which maps to standard console.log/error.
 * 2. Stdio/Extension Environment: Uses `StdioLogger` which redirects EVERYTHING to `stderr`.
 *    Claude captures `stderr` and displays it in its internal debug logs without
 *    breaking the connection.
 */
export interface Logger {
  info: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

const defaultLogger: Logger = {
  info: console.error, // Safe default for stdio
  error: console.error,
};

export interface ImagingProvider {
  encodeToJpg(pixels: Uint8Array, width: number, height: number): Promise<Buffer>;
}

export interface SessionProvider {
  resolveRequest(instanceHostname?: string): Promise<{ mychartRequest: MyChartRequest; instance: MyChartInstanceInfo } | { error: string }>;
  listAccounts(): Promise<CallToolResult>;
  connectInstance(instanceIdentifier: string): Promise<CallToolResult>;
  checkSession(instanceHostname?: string): Promise<CallToolResult>;
  complete2fa(instanceHostname: string, code: string): Promise<CallToolResult>;
  setupAccount?(args: { hostname: string; username: string; password?: string }): Promise<CallToolResult>;
}

export interface TelemetryProvider {
  sendEvent(name: string, properties?: Record<string, unknown>): void;
}

const noopTelemetry: TelemetryProvider = {
  sendEvent: () => {}
};

function errorResult(message: string): CallToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

function jsonResult(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

type ScraperFn = (req: MyChartRequest) => Promise<unknown>;

function registerScraperTool(
  server: McpServer, 
  sessionProvider: SessionProvider,
  telemetry: TelemetryProvider,
  logger: Logger,
  reg: (name: string, handler: (args: any) => Promise<CallToolResult>) => void, 
  name: string, 
  scraperFn: ScraperFn
) {
  reg(name,
    async (args: { instance?: string }): Promise<CallToolResult> => {
      telemetry.sendEvent('mcp_tool_called', { tool_name: name });
      logger.info(`[mcp] Tool call: ${name} (instance=${args.instance || 'auto'})`);
      try {
        const result = await sessionProvider.resolveRequest(args.instance);
        if ('error' in result) {
          logger.error(`[mcp] Tool ${name}: resolve error - ${result.error}`);
          return errorResult(result.error);
        }

        const infoBefore = result.mychartRequest.getCookieInfo();
        logger.info(`[mcp] Tool ${name}: starting with ${infoBefore.count} cookies (${result.instance.hostname})`);

        const data = await scraperFn(result.mychartRequest);
        const resultStr = JSON.stringify(data);
        const isEmpty = resultStr === '{}' || resultStr === '[]' || resultStr === 'null';
        logger.info(`[mcp] Tool ${name}: success (${resultStr.length} chars${isEmpty ? ', WARNING: empty' : ''})`);
        return jsonResult(data);
      } catch (err) {
        const error = err as Error;
        logger.error(`[mcp] Tool ${name}: error - ${error.message}`, error.stack);
        return errorResult(`Error fetching ${name}: ${error.message}`);
      }
    }
  );
}

export function registerAllTools(
  server: McpServer, 
  sessionProvider: SessionProvider,
  telemetry: TelemetryProvider = noopTelemetry,
  imagingProvider?: ImagingProvider,
  logger: Logger = defaultLogger
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function reg(name: string, handler: (args: any) => Promise<CallToolResult>) {
    const def = toolDef(name);
    server.registerTool(
      name,
      { description: def.description, inputSchema: def.inputSchema },
      // @ts-expect-error zod v3/v4 compat
      handler
    );
  }

  // Meta tools
  reg('list_accounts', () => sessionProvider.listAccounts());
  reg('connect_instance', (args: { instance: string }) => sessionProvider.connectInstance(args.instance));
  reg('check_session', (args: { instance?: string }) => sessionProvider.checkSession(args.instance));
  reg('complete_2fa', (args: { code: string; instance: string }) => sessionProvider.complete2fa(args.instance, args.code));
  reg('setup_account', (args: { hostname: string; username: string; password?: string }) => sessionProvider.setupAccount ? sessionProvider.setupAccount(args) : errorResult('setup_account not implemented for this provider'));

  // Scraper tools
  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_profile', async (req) => {
    const profile = await getMyChartProfile(req);
    const email = await getEmail(req);
    return { ...profile, email };
  });

  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_health_summary', getHealthSummary);
  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_medications', getMedications);
  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_allergies', getAllergies);
  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_health_issues', getHealthIssues);
  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_upcoming_visits', upcomingVisits);

  reg('get_past_visits',
    async (args: { years_back?: number; instance?: string }): Promise<CallToolResult> => {
      telemetry.sendEvent('mcp_tool_called', { tool_name: 'get_past_visits' });
      logger.info(`[mcp] Tool call: get_past_visits (instance=${args.instance || 'auto'})`);
      try {
        const result = await sessionProvider.resolveRequest(args.instance);
        if ('error' in result) return errorResult(result.error);
        const oldest = new Date();
        oldest.setFullYear(oldest.getFullYear() - (args.years_back ?? 2));
        const data = await pastVisits(result.mychartRequest, oldest);
        return jsonResult(data);
      } catch (err) {
        const error = err as Error;
        logger.error(`[mcp] get_past_visits: error - ${error.message}`, error.stack);
        return errorResult(`Error fetching past visits: ${error.message}`);
      }
    }
  );

  reg('get_visit_notes',
    async (args: { csn: string; instance?: string }): Promise<CallToolResult> => {
      telemetry.sendEvent('mcp_tool_called', { tool_name: 'get_visit_notes' });
      logger.info(`[mcp] Tool call: get_visit_notes (instance=${args.instance || 'auto'})`);
      try {
        const result = await sessionProvider.resolveRequest(args.instance);
        if ('error' in result) return errorResult(result.error);
        const data = await getVisitNotes(result.mychartRequest, args.csn);
        return jsonResult(data);
      } catch (err) {
        const error = err as Error;
        logger.error(`[mcp] get_visit_notes: error - ${error.message}`, error.stack);
        return errorResult(`Error fetching visit notes: ${error.message}`);
      }
    }
  );

  reg('get_note_content',
    async (args: { csn: string; lrp_id: string; hno_id: string; hno_dat: string; instance?: string }): Promise<CallToolResult> => {
      telemetry.sendEvent('mcp_tool_called', { tool_name: 'get_note_content' });
      logger.info(`[mcp] Tool call: get_note_content (instance=${args.instance || 'auto'})`);
      try {
        const result = await sessionProvider.resolveRequest(args.instance);
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
        logger.error(`[mcp] get_note_content: error - ${error.message}`, error.stack);
        return errorResult(`Error fetching note content: ${error.message}`);
      }
    }
  );

  reg('get_visit_avs',
    async (args: { csn: string; instance?: string }): Promise<CallToolResult> => {
      telemetry.sendEvent('mcp_tool_called', { tool_name: 'get_visit_avs' });
      logger.info(`[mcp] Tool call: get_visit_avs (instance=${args.instance || 'auto'})`);
      try {
        const result = await sessionProvider.resolveRequest(args.instance);
        if ('error' in result) return errorResult(result.error);
        const data = await getVisitAVS(result.mychartRequest, args.csn);
        return jsonResult(data);
      } catch (err) {
        const error = err as Error;
        logger.error(`[mcp] get_visit_avs: error - ${error.message}`, error.stack);
        return errorResult(`Error fetching visit AVS: ${error.message}`);
      }
    }
  );

  reg('get_lab_results',
    async (args: { instance?: string; limit?: number; offset?: number }): Promise<CallToolResult> => {
      telemetry.sendEvent('mcp_tool_called', { tool_name: 'get_lab_results' });
      logger.info(`[mcp] Tool call: get_lab_results (instance=${args.instance || 'auto'})`);
      try {
        const result = await sessionProvider.resolveRequest(args.instance);
        if ('error' in result) return errorResult(result.error);
        const raw = await listLabResults(result.mychartRequest) as LabTestResultWithHistory[];
        const trimmed = trimLabResults(raw);
        const page = paginate(trimmed, args.limit ?? 10, args.offset);
        return jsonResult({ total: trimmed.length, offset: args.offset ?? 0, count: page.length, results: page });
      } catch (err) {
        const error = err as Error;
        logger.error(`[mcp] get_lab_results: error - ${error.message}`, error.stack);
        return errorResult(`Error fetching get_lab_results: ${error.message}`);
      }
    }
  );

  reg('get_messages',
    async (args: { instance?: string; limit?: number; offset?: number }): Promise<CallToolResult> => {
      telemetry.sendEvent('mcp_tool_called', { tool_name: 'get_messages' });
      logger.info(`[mcp] Tool call: get_messages (instance=${args.instance || 'auto'})`);
      try {
        const result = await sessionProvider.resolveRequest(args.instance);
        if ('error' in result) return errorResult(result.error);
        const raw = await listConversations(result.mychartRequest) as ConversationListResponse | null;
        const trimmed = trimMessages(raw);
        const page = paginate(trimmed, args.limit ?? 10, args.offset);
        return jsonResult({ total: trimmed.length, offset: args.offset ?? 0, count: page.length, conversations: page });
      } catch (err) {
        const error = err as Error;
        logger.error(`[mcp] get_messages: error - ${error.message}`, error.stack);
        return errorResult(`Error fetching get_messages: ${error.message}`);
      }
    }
  );

  reg('get_message_recipients',
    async (args: { instance?: string }): Promise<CallToolResult> => {
      telemetry.sendEvent('mcp_tool_called', { tool_name: 'get_message_recipients' });
      logger.info(`[mcp] Tool call: get_message_recipients (instance=${args.instance || 'auto'})`);
      try {
        const result = await sessionProvider.resolveRequest(args.instance);
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
        logger.error(`[mcp] get_message_recipients: error - ${error.message}`, error.stack);
        return errorResult(`Error fetching message recipients: ${error.message}`);
      }
    }
  );

  reg('send_message',
    async (args: { instance?: string; recipient_name: string; topic: string; subject: string; message_body: string }): Promise<CallToolResult> => {
      telemetry.sendEvent('mcp_tool_called', { tool_name: 'send_message' });
      logger.info(`[mcp] Tool call: send_message (instance=${args.instance || 'auto'})`);
      try {
        const result = await sessionProvider.resolveRequest(args.instance);
        if ('error' in result) return errorResult(result.error);
        const token = await getVerificationToken(result.mychartRequest);
        if (!token) return errorResult('Could not get verification token');

        const [recipients, topics] = await Promise.all([
          getMessageRecipients(result.mychartRequest, token),
          getMessageTopics(result.mychartRequest, token),
        ]);

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
        logger.error(`[mcp] send_message: error - ${error.message}`, error.stack);
        return errorResult(`Error sending message: ${error.message}`);
      }
    }
  );

  reg('send_reply',
    async (args: { instance?: string; conversation_id: string; message_body: string }): Promise<CallToolResult> => {
      telemetry.sendEvent('mcp_tool_called', { tool_name: 'send_reply' });
      logger.info(`[mcp] Tool call: send_reply (instance=${args.instance || 'auto'})`);
      try {
        const result = await sessionProvider.resolveRequest(args.instance);
        if ('error' in result) return errorResult(result.error);
        const replyResult = await sendReply(result.mychartRequest, {
          conversationId: args.conversation_id,
          messageBody: args.message_body,
        });
        return jsonResult(replyResult);
      } catch (err) {
        const error = err as Error;
        logger.error(`[mcp] send_reply: error - ${error.message}`, error.stack);
        return errorResult(`Error sending reply: ${error.message}`);
      }
    }
  );

  reg('request_refill',
    async (args: { instance?: string; medication_name: string }): Promise<CallToolResult> => {
      telemetry.sendEvent('mcp_tool_called', { tool_name: 'request_refill' });
      logger.info(`[mcp] Tool call: request_refill (instance=${args.instance || 'auto'})`);
      try {
        const result = await sessionProvider.resolveRequest(args.instance);
        if ('error' in result) return errorResult(result.error);

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
        logger.error(`[mcp] request_refill: error - ${error.message}`, error.stack);
        return errorResult(`Error requesting refill: ${error.message}`);
      }
    }
  );

  reg('get_billing',
    async (args: { instance?: string; limit?: number; offset?: number }): Promise<CallToolResult> => {
      telemetry.sendEvent('mcp_tool_called', { tool_name: 'get_billing' });
      logger.info(`[mcp] Tool call: get_billing (instance=${args.instance || 'auto'})`);
      try {
        const result = await sessionProvider.resolveRequest(args.instance);
        if ('error' in result) return errorResult(result.error);
        const raw = await getBillingHistory(result.mychartRequest) as BillingAccount[];
        const trimmed = trimBilling(raw);
        const paginated = trimmed.map(acct => ({
          ...acct,
          totalVisits: acct.visits.length,
          visits: paginate(acct.visits, args.limit ?? 10, args.offset),
        }));
        return jsonResult(paginated);
      } catch (err) {
        const error = err as Error;
        logger.error(`[mcp] get_billing: error - ${error.message}`, error.stack);
        return errorResult(`Error fetching get_billing: ${error.message}`);
      }
    }
  );

  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_care_team', getCareTeam);
  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_insurance', getInsurance);
  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_immunizations', getImmunizations);
  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_preventive_care', getPreventiveCare);
  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_referrals', getReferrals);
  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_medical_history', getMedicalHistory);
  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_letters', getLetters);
  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_vitals', getVitals);
  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_emergency_contacts', getEmergencyContacts);

  reg('add_emergency_contact',
    async (args: { name: string; relationship_type: string; phone_number: string; instance?: string }): Promise<CallToolResult> => {
      telemetry.sendEvent('mcp_tool_called', { tool_name: 'add_emergency_contact' });
      logger.info(`[mcp] Tool call: add_emergency_contact (instance=${args.instance || 'auto'})`);
      try {
        const result = await sessionProvider.resolveRequest(args.instance);
        if ('error' in result) return errorResult(result.error);
        const data = await addEmergencyContact(result.mychartRequest, {
          name: args.name,
          relationshipType: args.relationship_type,
          phoneNumber: args.phone_number,
        });
        return jsonResult(data);
      } catch (err) {
        const error = err as Error;
        logger.error(`[mcp] add_emergency_contact: error - ${error.message}`, error.stack);
        return errorResult(`Error adding emergency contact: ${error.message}`);
      }
    }
  );

  reg('update_emergency_contact',
    async (args: { id: string; name?: string; relationship_type?: string; phone_number?: string; instance?: string }): Promise<CallToolResult> => {
      telemetry.sendEvent('mcp_tool_called', { tool_name: 'update_emergency_contact' });
      logger.info(`[mcp] Tool call: update_emergency_contact (instance=${args.instance || 'auto'})`);
      try {
        const result = await sessionProvider.resolveRequest(args.instance);
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
        logger.error(`[mcp] update_emergency_contact: error - ${error.message}`, error.stack);
        return errorResult(`Error updating emergency contact: ${error.message}`);
      }
    }
  );

  reg('remove_emergency_contact',
    async (args: { id: string; instance?: string }): Promise<CallToolResult> => {
      telemetry.sendEvent('mcp_tool_called', { tool_name: 'remove_emergency_contact' });
      logger.info(`[mcp] Tool call: remove_emergency_contact (instance=${args.instance || 'auto'})`);
      try {
        const result = await sessionProvider.resolveRequest(args.instance);
        if ('error' in result) return errorResult(result.error);
        const data = await removeEmergencyContact(result.mychartRequest, args.id);
        return jsonResult(data);
      } catch (err) {
        const error = err as Error;
        logger.error(`[mcp] remove_emergency_contact: error - ${error.message}`, error.stack);
        return errorResult(`Error removing emergency contact: ${error.message}`);
      }
    }
  );

  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_documents', getDocuments);
  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_goals', getGoals);
  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_upcoming_orders', getUpcomingOrders);
  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_questionnaires', getQuestionnaires);
  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_care_journeys', getCareJourneys);
  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_activity_feed', getActivityFeed);
  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_education_materials', getEducationMaterials);
  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_ehi_export', getEhiExportTemplates);

  reg('get_imaging_results',
    async (args: { instance?: string; limit?: number; offset?: number }): Promise<CallToolResult> => {
      telemetry.sendEvent('mcp_tool_called', { tool_name: 'get_imaging_results' });
      logger.info(`[mcp] Tool call: get_imaging_results (instance=${args.instance || 'auto'})`);
      try {
        const result = await sessionProvider.resolveRequest(args.instance);
        if ('error' in result) return errorResult(result.error);
        const raw = await getImagingResults(result.mychartRequest) as ImagingResult[];
        const trimmed = trimImagingResults(raw);
        const page = paginate(trimmed, args.limit ?? 10, args.offset);
        return jsonResult({ total: trimmed.length, offset: args.offset ?? 0, count: page.length, results: page });
      } catch (err) {
        const error = err as Error;
        logger.error(`[mcp] get_imaging_results: error - ${error.message}`, error.stack);
        return errorResult(`Error fetching get_imaging_results: ${error.message}`);
      }
    }
  );

  reg('download_imaging_study',
    async (args: { instance?: string; accession: string; order_name: string; max_images?: number }): Promise<CallToolResult> => {
      telemetry.sendEvent('mcp_tool_called', { tool_name: 'download_imaging_study' });
      if (!imagingProvider) return errorResult('Imaging tools are not available in this environment (requires a pure-JS encoder in MCPB).');

      try {
        const result = await sessionProvider.resolveRequest(args.instance);
        if ('error' in result) return errorResult(result.error);
        const req = result.mychartRequest;

        // 1. Find the imaging result by accession
        const allImaging = await getImagingResults(req) as ImagingResult[];
        const study = allImaging.find(img => 
          img.results?.some(r => r.orderMetadata?.accessionNumber === args.accession) ||
          img.orderName?.includes(args.order_name)
        );
        if (!study) return errorResult(`Imaging study with accession ${args.accession} not found.`);

        // 2. Get FDI context from report
        const firstResult = study.results?.[0];
        if (!firstResult?.reportDetails?.reportID) return errorResult('No report details available for this study.');
        
        const token = await getImagingToken(req);
        if (!token) return errorResult('Could not get verification token');

        const report = await getReportContentForImaging(req, firstResult.reportDetails.reportID, {
          ordId: firstResult.reportDetails.reportVars.ordId,
          ordDat: firstResult.reportDetails.reportVars.ordDat
        }, token);

        if (!report?.reportContent) return errorResult('Could not load report content.');
        const fdi = extractFdiContext(report.reportContent);
        if (!fdi) return errorResult('Could not find image viewer link in report.');

        // 3. Initialize eUnity session
        const eunity = await initEunitySession(req, fdi);
        if (!eunity) return errorResult('Failed to initialize image viewer session.');

        // 4. Download images
        const max = args.max_images ?? 5; // Default to 5 for MCP safety
        const images = [];
        for (let i = 0; i < Math.min(eunity.series.length, max); i++) {
          const s = eunity.series[i];
          const data = await downloadSingleImage(eunity, s.seriesUID, s.instanceUID);
          if (data) {
            // Parse CLO to raw pixels
            const bitmap16 = convertCloToBitmap16(data.pixelData, data.wrapperData);
            const metadata = data.wrapperData ? parseWrapper(data.wrapperData) : {};
            
            // Apply windowing (VOI LUT)
            const displayed = applyVoiLut(bitmap16.pixels, bitmap16.height, bitmap16.width, metadata);
            const invert = metadata.photometric === 'MONOCHROME1';
            const pixels8 = to8bit(displayed, invert);
            
            // Encode to JPG
            const jpg = await imagingProvider.encodeToJpg(pixels8, bitmap16.width, bitmap16.height);
            images.push({
              description: s.seriesDescription,
              base64: jpg.toString('base64'),
              contentType: 'image/jpeg'
            });
          }
        }

        return jsonResult({
          study: args.order_name,
          accession: args.accession,
          image_count: images.length,
          images
        });
      } catch (err) {
        const error = err as Error;
        logger.error(`[mcp] download_imaging_study: error - ${error.message}`, error.stack);
        return errorResult(`Imaging download failed: ${error.message}`);
      }
    }
  );

  reg('get_available_appointments',
    async (_args: { instance?: string; provider_name?: string; visit_type?: string }): Promise<CallToolResult> => {
      telemetry.sendEvent('mcp_tool_called', { tool_name: 'get_available_appointments' });
      return errorResult('Appointment scheduling is not yet available for real MyChart instances. This feature is coming soon.');
    }
  );

  reg('book_appointment',
    async (_args: { instance?: string; slot_id: string; reason?: string }): Promise<CallToolResult> => {
      telemetry.sendEvent('mcp_tool_called', { tool_name: 'book_appointment' });
      return errorResult('Appointment booking is not yet available for real MyChart instances. This feature is coming soon.');
    }
  );

  registerScraperTool(server, sessionProvider, telemetry, logger, reg, 'get_linked_mychart_accounts', async (req) => {
    const raw = await getLinkedMyChartAccounts(req) as LinkedMyChart[];
    return trimLinkedAccounts(raw);
  });
}
