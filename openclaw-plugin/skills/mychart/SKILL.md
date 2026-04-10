---
name: mychart
description: Access and interpret health data from Epic MyChart portals. Use when the user asks about their medications, lab results, appointments, doctors, billing, allergies, immunizations, or any medical records.
---

# MyChart Health Data

You have access to tools that retrieve health data from the user's Epic MyChart patient portal. All data is fetched locally — no external server is involved.

## Available Tools

### Core Health Data
- `mychart_get_profile` — Patient demographics (name, DOB, MRN, primary care provider, email)
- `mychart_get_health_summary` — Health summary (vitals, blood type, etc.)
- `mychart_get_medications` — Current prescriptions and dosages
- `mychart_get_allergies` — Known allergies and reactions
- `mychart_get_health_issues` — Active diagnoses and conditions
- `mychart_get_vitals` — Vitals and track-my-health flowsheet data (weight, blood pressure, etc.)

### Visits
- `mychart_get_upcoming_visits` — Scheduled appointments
- `mychart_get_past_visits` — Visit history (param: `years_back`, default 2)

### Results
- `mychart_get_lab_results` — Blood work, urinalysis, and other test results with reference ranges
- `mychart_get_imaging_results` — Imaging results (X-ray, MRI, CT, ultrasound)

### Messages
- `mychart_get_messages` — List message conversations from communication center
- `mychart_get_message_thread` — Get all messages in a specific conversation (param: `conversation_id`)
- `mychart_get_message_recipients` — Get providers who can receive messages
- `mychart_get_message_topics` — Get available message topics/categories
- `mychart_send_message` — Send a new message to a provider (params: `recipient`, `topic`, `subject`, `message`)
- `mychart_send_reply` — Reply to an existing conversation (params: `conversation_id`, `message`)
- `mychart_delete_message` — Delete a conversation (param: `conversation_id`)

### Records & Documents
- `mychart_get_medical_history` — Past conditions, surgical history, family history
- `mychart_get_letters` — After-visit summaries and clinical documents
- `mychart_get_documents` — Clinical documents
- `mychart_get_education_materials` — Assigned education materials
- `mychart_get_ehi_export` — Electronic health information export templates

### Care Management
- `mychart_get_care_team` — Care team members (doctors, specialists)
- `mychart_get_care_journeys` — Care plans and journeys
- `mychart_get_goals` — Care team and patient goals
- `mychart_get_preventive_care` — Screenings and preventive care recommendations
- `mychart_get_referrals` — Specialist referrals
- `mychart_get_upcoming_orders` — Upcoming lab, imaging, and procedure orders
- `mychart_get_questionnaires` — Health assessments and questionnaires

### Account Management
- `mychart_select_account` — Select which MyChart account to use (param: `query`, e.g. "uchealth" or "denver"). Call this FIRST when the user mentions a specific hospital or health system.
- `mychart_list_accounts` — List all configured MyChart accounts and connection status

### Administrative
- `mychart_get_insurance` — Insurance coverage details
- `mychart_get_billing` — Billing history and account details
- `mychart_get_emergency_contacts` — Emergency contact information
- `mychart_add_emergency_contact` — Add a new emergency contact (params: `name`, `relationship_type`, `phone_number`)
- `mychart_update_emergency_contact` — Update an existing emergency contact (params: `id`, optional: `name`, `relationship_type`, `phone_number`)
- `mychart_remove_emergency_contact` — Remove an emergency contact (param: `id`)
- `mychart_get_linked_accounts` — Linked MyChart accounts from other healthcare organizations
- `mychart_get_activity_feed` — Recent activity feed items

### Actions
- `mychart_request_refill` — Request a medication refill (param: `medication_key` from medications list)

## Guidelines

- **Session management is automatic.** The plugin logs in automatically using saved credentials and passkeys. You do not need to manage sessions.
- **Multiple accounts**: When the user mentions a specific hospital, health system, or MyChart account, ALWAYS call `mychart_select_account` first with the relevant keyword (e.g., "uchealth", "denver"). This sets the active account for all subsequent tool calls in the conversation. You do not need to pass the `account` parameter on every tool call after selecting an account.
- If a tool returns an error about credentials, tell the user to run `openclaw openrecord setup`.
- When presenting **lab results**, include reference ranges and flag abnormal values clearly.
- Present **medications** with dosage, frequency, and prescribing provider when available.
- For **billing data**, summarize totals and highlight outstanding balances.
- When sending messages, always use `mychart_get_message_recipients` and `mychart_get_message_topics` first to get valid values.
- **Never fabricate or assume health data** — only report what the tools return.
- **Be sensitive** — this is personal health information.
- If a tool returns an error, explain the issue clearly and suggest next steps.
