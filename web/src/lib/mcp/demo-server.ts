import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as demo from './demo-data';
import { toolDef } from './tool-definitions';

function jsonResult(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

const DEMO_HOSTNAME = 'mychart.springfieldmed.example.org';

/** Maps tool name → demo data for simple scraper tools (instance-only param) */
const scraperToolData: Record<string, unknown> = {
  get_profile: demo.demoProfile,
  get_health_summary: demo.demoHealthSummary,
  get_medications: demo.demoMedications,
  get_allergies: demo.demoAllergies,
  get_health_issues: demo.demoHealthIssues,
  get_upcoming_visits: demo.demoUpcomingVisits,
  get_care_team: demo.demoCareTeam,
  get_insurance: demo.demoInsurance,
  get_immunizations: demo.demoImmunizations,
  get_preventive_care: demo.demoPreventiveCare,
  get_referrals: demo.demoReferrals,
  get_medical_history: demo.demoMedicalHistory,
  get_letters: demo.demoLetters,
  get_vitals: demo.demoVitals,
  get_emergency_contacts: demo.demoEmergencyContacts,
  get_documents: demo.demoDocuments,
  get_goals: demo.demoGoals,
  get_upcoming_orders: demo.demoUpcomingOrders,
  get_questionnaires: demo.demoQuestionnaires,
  get_care_journeys: demo.demoCareJourneys,
  get_activity_feed: demo.demoActivityFeed,
  get_education_materials: demo.demoEducationMaterials,
  get_ehi_export: demo.demoEhiExport,
  get_linked_mychart_accounts: demo.demoLinkedAccounts,
};

export function createDemoMcpServer(): McpServer {
  const server = new McpServer({
    name: 'openrecord-demo',
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

  // ── Meta tools ──

  reg('list_accounts',
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

  reg('connect_instance',
    async (_args: { instance: string }): Promise<CallToolResult> => {
      return jsonResult({ status: 'logged_in', hostname: DEMO_HOSTNAME });
    }
  );

  reg('check_session',
    async (_args: { instance?: string }): Promise<CallToolResult> => {
      return jsonResult({ hostname: DEMO_HOSTNAME, connected: true, cookiesValid: true });
    }
  );

  reg('complete_2fa',
    async (_args: { code: string; instance: string }): Promise<CallToolResult> => {
      return jsonResult({ status: 'logged_in', message: '2FA completed successfully' });
    }
  );

  // ── Custom-parameter scraper tools ──

  // get_past_visits has a custom parameter
  reg('get_past_visits',
    async (_args: { years_back?: number; instance?: string }): Promise<CallToolResult> => {
      return jsonResult(demo.demoPastVisits);
    }
  );

  // Lab results — paginated
  reg('get_lab_results',
    async (args: { instance?: string; limit?: number; offset?: number }): Promise<CallToolResult> => {
      const offset = args.offset ?? 0;
      const limit = args.limit ?? 10;
      const page = demo.demoLabResults.slice(offset, offset + limit);
      return jsonResult({ total: demo.demoLabResults.length, offset, count: page.length, results: page });
    }
  );

  // Messages — paginated
  reg('get_messages',
    async (args: { instance?: string; limit?: number; offset?: number }): Promise<CallToolResult> => {
      const offset = args.offset ?? 0;
      const limit = args.limit ?? 10;
      const page = demo.demoMessages.slice(offset, offset + limit);
      return jsonResult({ total: demo.demoMessages.length, offset, count: page.length, conversations: page });
    }
  );

  // Billing — paginated
  reg('get_billing',
    async (args: { instance?: string; limit?: number; offset?: number }): Promise<CallToolResult> => {
      const offset = args.offset ?? 0;
      const limit = args.limit ?? 10;
      const page = demo.demoBilling.slice(offset, offset + limit);
      return jsonResult([{ totalVisits: demo.demoBilling.length, visits: page }]);
    }
  );

  // Imaging — paginated
  reg('get_imaging_results',
    async (args: { instance?: string; limit?: number; offset?: number }): Promise<CallToolResult> => {
      const offset = args.offset ?? 0;
      const limit = args.limit ?? 10;
      const page = demo.demoImagingResults.slice(offset, offset + limit);
      return jsonResult({ total: demo.demoImagingResults.length, offset, count: page.length, results: page });
    }
  );

  // ── Message recipients + topics ──

  reg('get_message_recipients',
    async (_args: { instance?: string }): Promise<CallToolResult> => {
      return jsonResult(demo.demoMessageRecipients);
    }
  );

  // ── Send message ──

  reg('send_message',
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

  reg('send_reply',
    async (args: { instance?: string; conversation_id: string; message_body: string }): Promise<CallToolResult> => {
      return jsonResult({
        success: true,
        conversationId: args.conversation_id,
      });
    }
  );

  // ── Request medication refill ──

  reg('request_refill',
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

  reg('get_available_appointments',
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

  reg('book_appointment',
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

  reg('add_emergency_contact',
    async (args: { name: string; relationship_type: string; phone_number: string; instance?: string }): Promise<CallToolResult> => {
      return jsonResult({
        success: true,
        contact: { name: args.name, relationship: args.relationship_type, phone: args.phone_number },
        message: `Emergency contact ${args.name} added successfully.`,
      });
    }
  );

  reg('update_emergency_contact',
    async (args: { id: string; name?: string; relationship_type?: string; phone_number?: string; instance?: string }): Promise<CallToolResult> => {
      return jsonResult({
        success: true,
        message: `Emergency contact ${args.id} updated successfully.`,
      });
    }
  );

  reg('remove_emergency_contact',
    async (args: { id: string; instance?: string }): Promise<CallToolResult> => {
      return jsonResult({
        success: true,
        message: `Emergency contact ${args.id} removed successfully.`,
      });
    }
  );

  // ── Register all standard scraper tools ──

  for (const [name, data] of Object.entries(scraperToolData)) {
    reg(name,
      async (_args: { instance?: string }): Promise<CallToolResult> => {
        return jsonResult(data);
      }
    );
  }

  return server;
}
