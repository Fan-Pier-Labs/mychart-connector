import { z } from 'zod/v3';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema?: Record<string, z.ZodTypeAny>;
}

// ── Reusable schema fragments ──

const instanceParam = {
  instance: z.string().optional().describe('MyChart hostname (required if multiple accounts connected)'),
};

const paginatedParams = {
  ...instanceParam,
  limit: z.number().optional().describe('Max results to return (default 10)'),
  offset: z.number().optional().describe('Number of results to skip (default 0)'),
};

// ── Tool definitions ──

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // Meta tools
  {
    name: 'list_accounts',
    description: 'List all MyChart accounts and their connection status',
    // No inputSchema — zero-argument tool
  },
  {
    name: 'connect_instance',
    description: 'Connect to a MyChart instance by hostname. Auto-completes 2FA if TOTP is configured.',
    inputSchema: { instance: z.string().describe('MyChart hostname to connect to') },
  },
  {
    name: 'check_session',
    description: 'Check current session status and hostname for a MyChart instance',
    inputSchema: { instance: z.string().optional().describe('MyChart hostname (checks all if omitted)') },
  },

  // Auth tools
  {
    name: 'complete_2fa',
    description: 'Complete 2FA verification for a MyChart instance. Pass the 2FA code and instance hostname.',
    inputSchema: {
      code: z.string(),
      instance: z.string().describe('MyChart hostname requiring 2FA'),
    },
  },

  // Simple scraper tools (instance-only param)
  { name: 'get_profile', description: 'Get patient profile (name, DOB, MRN, PCP) and email', inputSchema: instanceParam },
  { name: 'get_health_summary', description: 'Get health summary (vitals, blood type, etc.)', inputSchema: instanceParam },
  { name: 'get_medications', description: 'Get current medications list', inputSchema: instanceParam },
  { name: 'get_allergies', description: 'Get allergies list', inputSchema: instanceParam },
  { name: 'get_health_issues', description: 'Get health issues / active conditions', inputSchema: instanceParam },
  { name: 'get_upcoming_visits', description: 'Get upcoming appointments', inputSchema: instanceParam },
  { name: 'get_care_team', description: 'Get care team members', inputSchema: instanceParam },
  { name: 'get_insurance', description: 'Get insurance information', inputSchema: instanceParam },
  { name: 'get_immunizations', description: 'Get immunization records', inputSchema: instanceParam },
  { name: 'get_preventive_care', description: 'Get preventive care items and recommendations', inputSchema: instanceParam },
  { name: 'get_referrals', description: 'Get referral information', inputSchema: instanceParam },
  { name: 'get_medical_history', description: 'Get medical history (past conditions, surgical history, family history)', inputSchema: instanceParam },
  { name: 'get_letters', description: 'Get letters (after-visit summaries, clinical documents)', inputSchema: instanceParam },
  { name: 'get_vitals', description: 'Get vitals and track-my-health flowsheet data (weight, blood pressure, etc.)', inputSchema: instanceParam },
  { name: 'get_emergency_contacts', description: 'Get emergency contacts', inputSchema: instanceParam },
  { name: 'get_documents', description: 'Get clinical documents', inputSchema: instanceParam },
  { name: 'get_goals', description: 'Get care team and patient goals', inputSchema: instanceParam },
  { name: 'get_upcoming_orders', description: 'Get upcoming orders (labs, imaging, procedures)', inputSchema: instanceParam },
  { name: 'get_questionnaires', description: 'Get questionnaires and health assessments', inputSchema: instanceParam },
  { name: 'get_care_journeys', description: 'Get care journeys and care plans', inputSchema: instanceParam },
  { name: 'get_activity_feed', description: 'Get recent activity feed items', inputSchema: instanceParam },
  { name: 'get_education_materials', description: 'Get assigned education materials', inputSchema: instanceParam },
  { name: 'get_ehi_export', description: 'Get electronic health information export templates', inputSchema: instanceParam },
  { name: 'get_linked_mychart_accounts', description: 'Get linked MyChart accounts from other healthcare organizations', inputSchema: instanceParam },

  // Custom-parameter tools
  {
    name: 'get_past_visits',
    description: 'Get past visits/appointments. Optionally specify years_back (default 2).',
    inputSchema: {
      years_back: z.number().optional(),
      ...instanceParam,
    },
  },
  {
    name: 'get_lab_results',
    description: 'Get lab results. Returns trimmed results with component name, value, units, range, and abnormal flag. Supports pagination (default limit 10).',
    inputSchema: paginatedParams,
  },
  {
    name: 'get_messages',
    description: 'Get message conversations. Returns subject, date, author, and plain text body (HTML stripped). Supports pagination (default limit 10).',
    inputSchema: {
      ...instanceParam,
      limit: z.number().optional().describe('Max conversations to return (default 10)'),
      offset: z.number().optional().describe('Number of conversations to skip (default 0)'),
    },
  },
  {
    name: 'get_billing',
    description: 'Get billing history including visits/charges, patient payments (MyChart payments made via credit card), and statements. Supports pagination on visits (default limit 10).',
    inputSchema: {
      ...instanceParam,
      limit: z.number().optional().describe('Max visits per account to return (default 10)'),
      offset: z.number().optional().describe('Number of visits to skip (default 0)'),
    },
  },
  {
    name: 'get_imaging_results',
    description: 'Get imaging results (X-ray, MRI, CT, ultrasound). Returns order name, date, provider, and report/impression text.',
    inputSchema: paginatedParams,
  },

  // Messaging tools
  {
    name: 'get_message_recipients',
    description: 'Get list of available message recipients (providers) and message topics/categories',
    inputSchema: instanceParam,
  },
  {
    name: 'send_message',
    description: 'Send a new message to a provider, starting a new conversation thread',
    inputSchema: {
      ...instanceParam,
      recipient_name: z.string().describe('Name of the recipient provider (fuzzy matched against available recipients)'),
      topic: z.string().describe('Message topic/category (fuzzy matched against available topics)'),
      subject: z.string().describe('Message subject line'),
      message_body: z.string().describe('Message body text'),
    },
  },
  {
    name: 'send_reply',
    description: 'Reply to an existing message conversation',
    inputSchema: {
      ...instanceParam,
      conversation_id: z.string().describe('The conversation ID (hthId from get_messages) to reply to'),
      message_body: z.string().describe('Reply message body text'),
    },
  },

  // Medication tools
  {
    name: 'request_refill',
    description: 'Request a medication refill. Use get_medications first to find the medication key for refillable medications.',
    inputSchema: {
      ...instanceParam,
      medication_name: z.string().describe('Name of the medication to refill (fuzzy matched against current medications)'),
    },
  },

  // Emergency contact tools
  {
    name: 'add_emergency_contact',
    description: 'Add a new emergency contact',
    inputSchema: {
      name: z.string().describe('Full name of the emergency contact'),
      relationship_type: z.string().describe('Relationship to patient (e.g. Spouse, Parent, Friend, Sibling)'),
      phone_number: z.string().describe('Phone number'),
      ...instanceParam,
    },
  },
  {
    name: 'update_emergency_contact',
    description: 'Update an existing emergency contact. Get the contact ID from get_emergency_contacts first.',
    inputSchema: {
      id: z.string().describe('Contact ID to update'),
      name: z.string().optional().describe('New full name'),
      relationship_type: z.string().optional().describe('New relationship type'),
      phone_number: z.string().optional().describe('New phone number'),
      ...instanceParam,
    },
  },
  {
    name: 'remove_emergency_contact',
    description: 'Remove an emergency contact. Get the contact ID from get_emergency_contacts first.',
    inputSchema: {
      id: z.string().describe('Contact ID to remove'),
      ...instanceParam,
    },
  },

  // Appointment tools
  {
    name: 'get_available_appointments',
    description: 'Get available appointment slots for scheduling. Optionally filter by provider name or visit type.',
    inputSchema: {
      ...instanceParam,
      provider_name: z.string().optional().describe('Filter by provider name (fuzzy match)'),
      visit_type: z.string().optional().describe('Filter by visit type (e.g. Office Visit, Lab Work, Follow-Up)'),
    },
  },
  {
    name: 'book_appointment',
    description: 'Book an appointment using a slot ID from get_available_appointments',
    inputSchema: {
      ...instanceParam,
      slot_id: z.string().describe('The slot ID from get_available_appointments to book'),
      reason: z.string().optional().describe('Reason for the visit'),
    },
  },
];

/** Lookup a tool definition by name. Throws if not found. */
export function toolDef(name: string): ToolDefinition {
  const def = TOOL_DEFINITIONS.find(t => t.name === name);
  if (!def) throw new Error(`Unknown tool: ${name}. Add it to TOOL_DEFINITIONS in tool-definitions.ts`);
  return def;
}
