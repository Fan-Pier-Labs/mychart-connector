import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as demo from './demo-data';

function jsonResult(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

const DEMO_HOSTNAME = 'mychart.springfieldmed.example.org';

type DemoToolDef = {
  name: string;
  description: string;
  data: unknown;
};

const scraperTools: DemoToolDef[] = [
  { name: 'get_profile', description: 'Get patient profile (name, DOB, MRN, PCP) and email', data: demo.demoProfile },
  { name: 'get_health_summary', description: 'Get health summary (vitals, blood type, etc.)', data: demo.demoHealthSummary },
  { name: 'get_medications', description: 'Get current medications list', data: demo.demoMedications },
  { name: 'get_allergies', description: 'Get allergies list', data: demo.demoAllergies },
  { name: 'get_health_issues', description: 'Get health issues / active conditions', data: demo.demoHealthIssues },
  { name: 'get_upcoming_visits', description: 'Get upcoming appointments', data: demo.demoUpcomingVisits },
  { name: 'get_care_team', description: 'Get care team members', data: demo.demoCareTeam },
  { name: 'get_insurance', description: 'Get insurance information', data: demo.demoInsurance },
  { name: 'get_immunizations', description: 'Get immunization records', data: demo.demoImmunizations },
  { name: 'get_preventive_care', description: 'Get preventive care items and recommendations', data: demo.demoPreventiveCare },
  { name: 'get_referrals', description: 'Get referral information', data: demo.demoReferrals },
  { name: 'get_medical_history', description: 'Get medical history (past conditions, surgical history, family history)', data: demo.demoMedicalHistory },
  { name: 'get_letters', description: 'Get letters (after-visit summaries, clinical documents)', data: demo.demoLetters },
  { name: 'get_vitals', description: 'Get vitals and track-my-health flowsheet data (weight, blood pressure, etc.)', data: demo.demoVitals },
  { name: 'get_emergency_contacts', description: 'Get emergency contacts', data: demo.demoEmergencyContacts },
  { name: 'get_documents', description: 'Get clinical documents', data: demo.demoDocuments },
  { name: 'get_goals', description: 'Get care team and patient goals', data: demo.demoGoals },
  { name: 'get_upcoming_orders', description: 'Get upcoming orders (labs, imaging, procedures)', data: demo.demoUpcomingOrders },
  { name: 'get_questionnaires', description: 'Get questionnaires and health assessments', data: demo.demoQuestionnaires },
  { name: 'get_care_journeys', description: 'Get care journeys and care plans', data: demo.demoCareJourneys },
  { name: 'get_activity_feed', description: 'Get recent activity feed items', data: demo.demoActivityFeed },
  { name: 'get_education_materials', description: 'Get assigned education materials', data: demo.demoEducationMaterials },
  { name: 'get_ehi_export', description: 'Get electronic health information export templates', data: demo.demoEhiExport },
  { name: 'get_linked_mychart_accounts', description: 'Get linked MyChart accounts from other healthcare organizations', data: demo.demoLinkedAccounts },
];

export function createDemoMcpServer(): McpServer {
  const server = new McpServer({
    name: 'mychart-health-demo',
    version: '1.0.0',
  });

  // ── Meta tools ──

  server.tool(
    'list_accounts',
    'List all MyChart accounts and their connection status',
    async (): Promise<CallToolResult> => {
      return jsonResult([
        {
          hostname: DEMO_HOSTNAME,
          username: 'homersimpson742',
          connected: true,
          hasTotpSecret: true,
        },
      ]);
    }
  );

  server.registerTool(
    'connect_instance',
    {
      description: 'Connect to a MyChart instance by hostname. Auto-completes 2FA if TOTP is configured.',
      inputSchema: { instance: z.string().describe('MyChart hostname to connect to') },
    },
    // @ts-expect-error zod v3/v4 compat
    async (_args: { instance: string }): Promise<CallToolResult> => {
      return jsonResult({ status: 'logged_in', hostname: DEMO_HOSTNAME });
    }
  );

  server.registerTool(
    'check_session',
    {
      description: 'Check current session status and hostname for a MyChart instance',
      inputSchema: { instance: z.string().optional().describe('MyChart hostname (checks all if omitted)') },
    },
    // @ts-expect-error zod v3/v4 compat
    async (_args: { instance?: string }): Promise<CallToolResult> => {
      return jsonResult({ hostname: DEMO_HOSTNAME, connected: true, cookiesValid: true });
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
    // @ts-expect-error zod v3/v4 compat
    async (_args: { code: string; instance: string }): Promise<CallToolResult> => {
      return jsonResult({ status: 'logged_in', message: '2FA completed successfully' });
    }
  );

  // ── Custom-parameter scraper tools ──

  // get_past_visits has a custom parameter
  server.registerTool(
    'get_past_visits',
    {
      description: 'Get past visits/appointments. Optionally specify years_back (default 2).',
      inputSchema: {
        years_back: z.number().optional(),
        instance: z.string().optional().describe('MyChart hostname (required if multiple accounts connected)'),
      },
    },
    // @ts-expect-error zod v3/v4 compat
    async (_args: { years_back?: number; instance?: string }): Promise<CallToolResult> => {
      return jsonResult(demo.demoPastVisits);
    }
  );

  // Lab results — paginated
  server.registerTool(
    'get_lab_results',
    {
      description: 'Get lab results. Returns trimmed results with component name, value, units, range, and abnormal flag. Supports pagination (default limit 10).',
      inputSchema: {
        instance: z.string().optional().describe('MyChart hostname (required if multiple accounts connected)'),
        limit: z.number().optional().describe('Max results to return (default 10)'),
        offset: z.number().optional().describe('Number of results to skip (default 0)'),
      },
    },
    // @ts-expect-error zod v3/v4 compat
    async (args: { instance?: string; limit?: number; offset?: number }): Promise<CallToolResult> => {
      const offset = args.offset ?? 0;
      const limit = args.limit ?? 10;
      const page = demo.demoLabResults.slice(offset, offset + limit);
      return jsonResult({ total: demo.demoLabResults.length, offset, count: page.length, results: page });
    }
  );

  // Messages — paginated
  server.registerTool(
    'get_messages',
    {
      description: 'Get message conversations. Returns subject, date, author, and plain text body (HTML stripped). Supports pagination (default limit 10).',
      inputSchema: {
        instance: z.string().optional().describe('MyChart hostname (required if multiple accounts connected)'),
        limit: z.number().optional().describe('Max conversations to return (default 10)'),
        offset: z.number().optional().describe('Number of conversations to skip (default 0)'),
      },
    },
    // @ts-expect-error zod v3/v4 compat
    async (args: { instance?: string; limit?: number; offset?: number }): Promise<CallToolResult> => {
      const offset = args.offset ?? 0;
      const limit = args.limit ?? 10;
      const page = demo.demoMessages.slice(offset, offset + limit);
      return jsonResult({ total: demo.demoMessages.length, offset, count: page.length, conversations: page });
    }
  );

  // Billing — paginated
  server.registerTool(
    'get_billing',
    {
      description: 'Get billing history. Returns date, description, provider, payer, amounts, and coverage summary. Supports pagination on visits (default limit 10).',
      inputSchema: {
        instance: z.string().optional().describe('MyChart hostname (required if multiple accounts connected)'),
        limit: z.number().optional().describe('Max visits per account to return (default 10)'),
        offset: z.number().optional().describe('Number of visits to skip (default 0)'),
      },
    },
    // @ts-expect-error zod v3/v4 compat
    async (args: { instance?: string; limit?: number; offset?: number }): Promise<CallToolResult> => {
      const offset = args.offset ?? 0;
      const limit = args.limit ?? 10;
      const page = demo.demoBilling.slice(offset, offset + limit);
      return jsonResult([{ totalVisits: demo.demoBilling.length, visits: page }]);
    }
  );

  // Imaging — paginated
  server.registerTool(
    'get_imaging_results',
    {
      description: 'Get imaging results (X-ray, MRI, CT, ultrasound). Returns order name, date, provider, and report/impression text.',
      inputSchema: {
        instance: z.string().optional().describe('MyChart hostname (required if multiple accounts connected)'),
        limit: z.number().optional().describe('Max results to return (default 10)'),
        offset: z.number().optional().describe('Number of results to skip (default 0)'),
      },
    },
    // @ts-expect-error zod v3/v4 compat
    async (args: { instance?: string; limit?: number; offset?: number }): Promise<CallToolResult> => {
      const offset = args.offset ?? 0;
      const limit = args.limit ?? 10;
      const page = demo.demoImagingResults.slice(offset, offset + limit);
      return jsonResult({ total: demo.demoImagingResults.length, offset, count: page.length, results: page });
    }
  );

  // ── Message recipients + topics ──

  server.registerTool(
    'get_message_recipients',
    {
      description: 'Get list of available message recipients (providers) and message topics/categories',
      inputSchema: {
        instance: z.string().optional().describe('MyChart hostname (required if multiple accounts connected)'),
      },
    },
    // @ts-expect-error zod v3/v4 compat
    async (_args: { instance?: string }): Promise<CallToolResult> => {
      return jsonResult(demo.demoMessageRecipients);
    }
  );

  // ── Send message ──

  server.registerTool(
    'send_message',
    {
      description: 'Send a new message to a provider, starting a new conversation thread',
      inputSchema: {
        instance: z.string().optional().describe('MyChart hostname (required if multiple accounts connected)'),
        recipient_name: z.string().describe('Name of the recipient provider (fuzzy matched against available recipients)'),
        topic: z.string().describe('Message topic/category (fuzzy matched against available topics)'),
        subject: z.string().describe('Message subject line'),
        message_body: z.string().describe('Message body text'),
      },
    },
    // @ts-expect-error zod v3/v4 compat
    async (args: { instance?: string; recipient_name: string; topic: string; subject: string; message_body: string }): Promise<CallToolResult> => {
      // Fuzzy-match recipient
      const query = args.recipient_name.toLowerCase();
      const matched = demo.demoMessageRecipients.recipients.filter(r =>
        r.displayName.toLowerCase().includes(query)
      );
      if (matched.length === 0) {
        const available = demo.demoMessageRecipients.recipients.map(r => r.displayName).join(', ');
        return { content: [{ type: 'text', text: `No recipient matching "${args.recipient_name}". Available: ${available}` }], isError: true };
      }
      if (matched.length > 1) {
        const names = matched.map(r => r.displayName).join(', ');
        return { content: [{ type: 'text', text: `Multiple recipients match "${args.recipient_name}": ${names}. Please be more specific.` }], isError: true };
      }

      return jsonResult({
        success: true,
        conversationId: `demo-conv-${Date.now()}`,
        recipient: matched[0].displayName,
        subject: args.subject,
      });
    }
  );

  // ── Send reply ──

  server.registerTool(
    'send_reply',
    {
      description: 'Reply to an existing message conversation',
      inputSchema: {
        instance: z.string().optional().describe('MyChart hostname (required if multiple accounts connected)'),
        conversation_id: z.string().describe('The conversation ID (hthId from get_messages) to reply to'),
        message_body: z.string().describe('Reply message body text'),
      },
    },
    // @ts-expect-error zod v3/v4 compat
    async (args: { instance?: string; conversation_id: string; message_body: string }): Promise<CallToolResult> => {
      return jsonResult({
        success: true,
        conversationId: args.conversation_id,
      });
    }
  );

  // ── Request medication refill ──

  server.registerTool(
    'request_refill',
    {
      description: 'Request a medication refill. Use get_medications first to find the medication key for refillable medications.',
      inputSchema: {
        instance: z.string().optional().describe('MyChart hostname (required if multiple accounts connected)'),
        medication_name: z.string().describe('Name of the medication to refill (fuzzy matched against current medications)'),
      },
    },
    // @ts-expect-error zod v3/v4 compat
    async (args: { instance?: string; medication_name: string }): Promise<CallToolResult> => {
      const query = args.medication_name.toLowerCase();
      const matched = demo.demoMedications.filter(m =>
        m.name.toLowerCase().includes(query)
      );
      if (matched.length === 0) {
        const available = demo.demoMedications.map(m => m.name).join(', ');
        return { content: [{ type: 'text', text: `No medication matching "${args.medication_name}". Available: ${available}` }], isError: true };
      }
      if (matched.length > 1) {
        const names = matched.map(m => m.name).join(', ');
        return { content: [{ type: 'text', text: `Multiple medications match "${args.medication_name}": ${names}. Please be more specific.` }], isError: true };
      }

      const med = matched[0];
      if (med.refillsRemaining <= 0) {
        return { content: [{ type: 'text', text: `"${med.name}" has no refills remaining. Contact your provider for a new prescription.` }], isError: true };
      }

      return jsonResult({
        success: true,
        medication: med.name,
        pharmacy: med.pharmacy,
        message: `Refill request submitted for ${med.name}. Your pharmacy (${med.pharmacy}) will be notified.`,
      });
    }
  );

  // ── Get available appointment slots ──

  server.registerTool(
    'get_available_appointments',
    {
      description: 'Get available appointment slots for scheduling. Optionally filter by provider name or visit type.',
      inputSchema: {
        instance: z.string().optional().describe('MyChart hostname (required if multiple accounts connected)'),
        provider_name: z.string().optional().describe('Filter by provider name (fuzzy match)'),
        visit_type: z.string().optional().describe('Filter by visit type (e.g. Office Visit, Lab Work, Follow-Up)'),
      },
    },
    // @ts-expect-error zod v3/v4 compat
    async (args: { instance?: string; provider_name?: string; visit_type?: string }): Promise<CallToolResult> => {
      let results = demo.demoAvailableAppointments;
      if (args.provider_name) {
        const q = args.provider_name.toLowerCase();
        results = results.filter(r => r.provider.toLowerCase().includes(q));
      }
      if (args.visit_type) {
        const q = args.visit_type.toLowerCase();
        results = results.filter(r => r.visitType.toLowerCase().includes(q));
      }
      if (results.length === 0) {
        return { content: [{ type: 'text', text: 'No available appointments matching your criteria.' }], isError: true };
      }
      return jsonResult(results);
    }
  );

  // ── Book appointment ──

  server.registerTool(
    'book_appointment',
    {
      description: 'Book an appointment using a slot ID from get_available_appointments',
      inputSchema: {
        instance: z.string().optional().describe('MyChart hostname (required if multiple accounts connected)'),
        slot_id: z.string().describe('The slot ID from get_available_appointments to book'),
        reason: z.string().optional().describe('Reason for the visit'),
      },
    },
    // @ts-expect-error zod v3/v4 compat
    async (args: { instance?: string; slot_id: string; reason?: string }): Promise<CallToolResult> => {
      // Find the slot across all providers
      for (const provider of demo.demoAvailableAppointments) {
        const slot = provider.slots.find(s => s.slotId === args.slot_id);
        if (slot) {
          return jsonResult({
            success: true,
            confirmationNumber: `SPRFLD-${Date.now().toString(36).toUpperCase()}`,
            provider: provider.provider,
            department: provider.department,
            location: provider.location,
            visitType: provider.visitType,
            date: slot.date,
            time: slot.time,
            reason: args.reason || 'Not specified',
            message: `Appointment booked with ${provider.provider} on ${slot.date} at ${slot.time}.`,
          });
        }
      }
      return { content: [{ type: 'text', text: `Slot "${args.slot_id}" not found. Use get_available_appointments to see available slots.` }], isError: true };
    }
  );

  // ── Emergency contact management ──

  server.registerTool(
    'add_emergency_contact',
    {
      description: 'Add a new emergency contact',
      inputSchema: {
        name: z.string().describe('Full name of the emergency contact'),
        relationship_type: z.string().describe('Relationship to patient (e.g. Spouse, Parent, Friend, Sibling)'),
        phone_number: z.string().describe('Phone number'),
        instance: z.string().optional().describe('MyChart hostname (required if multiple accounts connected)'),
      },
    },
    // @ts-expect-error zod v3/v4 compat
    async (args: { name: string; relationship_type: string; phone_number: string; instance?: string }): Promise<CallToolResult> => {
      return jsonResult({
        success: true,
        contact: { name: args.name, relationship: args.relationship_type, phone: args.phone_number },
        message: `Emergency contact ${args.name} added successfully.`,
      });
    }
  );

  server.registerTool(
    'update_emergency_contact',
    {
      description: 'Update an existing emergency contact. Get the contact ID from get_emergency_contacts first.',
      inputSchema: {
        id: z.string().describe('Contact ID to update'),
        name: z.string().optional().describe('New full name'),
        relationship_type: z.string().optional().describe('New relationship type'),
        phone_number: z.string().optional().describe('New phone number'),
        instance: z.string().optional().describe('MyChart hostname (required if multiple accounts connected)'),
      },
    },
    // @ts-expect-error zod v3/v4 compat
    async (args: { id: string; name?: string; relationship_type?: string; phone_number?: string; instance?: string }): Promise<CallToolResult> => {
      return jsonResult({
        success: true,
        message: `Emergency contact ${args.id} updated successfully.`,
      });
    }
  );

  server.registerTool(
    'remove_emergency_contact',
    {
      description: 'Remove an emergency contact. Get the contact ID from get_emergency_contacts first.',
      inputSchema: {
        id: z.string().describe('Contact ID to remove'),
        instance: z.string().optional().describe('MyChart hostname (required if multiple accounts connected)'),
      },
    },
    // @ts-expect-error zod v3/v4 compat
    async (args: { id: string; instance?: string }): Promise<CallToolResult> => {
      return jsonResult({
        success: true,
        message: `Emergency contact ${args.id} removed successfully.`,
      });
    }
  );

  // ── Register all standard scraper tools ──

  for (const tool of scraperTools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: { instance: z.string().optional().describe('MyChart hostname (required if multiple accounts connected)') },
      },
      // @ts-expect-error zod v3/v4 compat
      async (_args: { instance?: string }): Promise<CallToolResult> => {
        return jsonResult(tool.data);
      }
    );
  }

  return server;
}
