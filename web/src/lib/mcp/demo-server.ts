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
  { name: 'get_lab_results', description: 'Get lab results and test details', data: demo.demoLabResults },
  { name: 'get_messages', description: 'Get message conversations from communication center', data: demo.demoMessages },
  { name: 'get_billing', description: 'Get billing history and account details', data: demo.demoBilling },
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
  { name: 'get_imaging_results', description: 'Get imaging results (X-ray, MRI, CT, ultrasound, etc.)', data: demo.demoImagingResults },
  { name: 'get_linked_mychart_accounts', description: 'Get linked MyChart accounts from other healthcare organizations', data: demo.demoLinkedAccounts },
];

export function createDemoMcpServer(): McpServer {
  const server = new McpServer({
    name: 'mychart-health-demo',
    version: '1.0.0',
  });

  // Meta tools
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

  // Register all standard scraper tools
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
