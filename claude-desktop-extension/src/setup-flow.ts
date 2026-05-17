/**
 * Elicitation-driven setup wizard for a new MyChart account.
 *
 * The server orchestrates every step via MCP `elicitation/create`. Claude
 * Desktop renders structured prompts to the user; the wizard advances
 * deterministically through:
 *
 *   1. Pick a MyChart (search → narrow → confirm).
 *   2. Collect username + password.
 *   3. Attempt login.
 *   4. If 2FA required → collect the 6-digit code.
 *   5. Ask whether to register a passkey for passwordless logins later.
 *   6. Persist credentials, return summary.
 *
 * The agent does not decide field names or step order — the server does.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { myChartUserPassLogin, complete2faFlow, areCookiesValid } from '../../scrapers/myChart/login';
import { setupPasskey } from '../../scrapers/myChart/setupPasskey';
import { getEmail, getMyChartProfile } from '../../scrapers/myChart/profile';
import { serializeCredential } from '../../scrapers/myChart/softwareAuthenticator';
import { searchInstances, findByHostname, type Instance } from './instances';
import {
  saveAccountPasskey,
  upsertAccount,
  normalizeHostname,
  saveAccountSession,
} from './credential-store';

interface ElicitOk<T> { action: 'accept'; content: T; }
interface ElicitCancel { action: 'cancel' | 'decline'; }
type ElicitResult<T> = ElicitOk<T> | ElicitCancel;

// ── Elicitation helpers ────────────────────────────────────────────────────

async function elicit<T extends Record<string, unknown>>(
  server: McpServer,
  message: string,
  properties: Record<string, unknown>,
  required: string[] = [],
): Promise<ElicitResult<T>> {
  const result = await server.server.elicitInput({
    message,
    requestedSchema: {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  if (result.action === 'accept') {
    return { action: 'accept', content: (result.content as T) ?? ({} as T) };
  }
  return { action: result.action as 'cancel' | 'decline' };
}

function cancelMessage(): string {
  return 'Setup cancelled. You can run setup_account again any time.';
}

// ── Step 1: pick a MyChart ─────────────────────────────────────────────────

async function pickInstance(server: McpServer): Promise<Instance | { hostname: string } | null> {
  // 1a. Free-text search query
  const query = await elicit<{ query: string }>(
    server,
    "Which MyChart do you want to connect? Type a search term (e.g. \"uchealth\", \"mass general\") OR the full hostname (e.g. \"mychart.example.org\").",
    {
      query: {
        type: 'string',
        title: 'MyChart name or hostname',
        description: 'A few letters of the health system\'s name, or the full mychart.* hostname.',
        minLength: 2,
      },
    },
    ['query'],
  );
  if (query.action !== 'accept' || !query.content.query) return null;

  const q = query.content.query.trim();

  // 1b. If it looks like a hostname (has a dot), check the catalog first
  if (q.includes('.')) {
    const known = findByHostname(q);
    if (known) {
      const confirm = await confirmInstance(server, known);
      if (!confirm) return null;
      return known;
    }
    // Free-text hostname not in catalog — confirm and use
    const confirm = await elicit<{ confirm: boolean }>(
      server,
      `I don't know "${q}" — is this your MyChart hostname?`,
      {
        confirm: {
          type: 'boolean',
          title: `Use ${q}?`,
          description: 'Choose Yes if this is your MyChart hostname, No to search again.',
          default: true,
        },
      },
      ['confirm'],
    );
    if (confirm.action !== 'accept' || !confirm.content.confirm) return null;
    return { hostname: q.toLowerCase() };
  }

  // 1c. Search the catalog
  const matches = searchInstances(q, 25);
  if (matches.length === 0) {
    // Ask if user wants to enter a hostname manually
    const fallback = await elicit<{ hostname: string }>(
      server,
      `No MyChart matched "${q}". Enter the exact hostname (e.g. "mychart.example.org"), or cancel to start over.`,
      {
        hostname: {
          type: 'string',
          title: 'MyChart hostname',
          description: 'The mychart.* domain you log into in the browser.',
          minLength: 3,
        },
      },
      ['hostname'],
    );
    if (fallback.action !== 'accept' || !fallback.content.hostname) return null;
    return { hostname: fallback.content.hostname.toLowerCase().trim() };
  }

  if (matches.length === 1) {
    if (await confirmInstance(server, matches[0])) return matches[0];
    return null;
  }

  // 1d. Multiple matches → enum picker
  const enumValues = matches.map(m => m.hostname);
  const enumNames = matches.map(m => `${m.name} (${m.hostname})`);
  const pick = await elicit<{ hostname: string }>(
    server,
    `Found ${matches.length} matches for "${q}". Pick yours:`,
    {
      hostname: {
        type: 'string',
        title: 'MyChart',
        enum: enumValues,
        enumNames,
      },
    },
    ['hostname'],
  );
  if (pick.action !== 'accept' || !pick.content.hostname) return null;
  return findByHostname(pick.content.hostname) ?? { hostname: pick.content.hostname };
}

async function confirmInstance(server: McpServer, instance: Instance): Promise<boolean> {
  const result = await elicit<{ confirm: boolean }>(
    server,
    `Use ${instance.name} (${instance.hostname})?`,
    {
      confirm: {
        type: 'boolean',
        title: `Connect to ${instance.name}?`,
        description: `MyChart hostname: ${instance.hostname}`,
        default: true,
      },
    },
    ['confirm'],
  );
  return result.action === 'accept' && !!result.content.confirm;
}

// ── Step 2: credentials ────────────────────────────────────────────────────

async function collectCredentials(server: McpServer): Promise<{ username: string; password: string } | null> {
  const result = await elicit<{ username: string; password: string }>(
    server,
    'Enter your MyChart username and password. (These are stored locally on your machine, never sent to Anthropic.)',
    {
      username: {
        type: 'string',
        title: 'Username',
        minLength: 1,
      },
      password: {
        type: 'string',
        title: 'Password',
        description: 'Your MyChart account password.',
        minLength: 1,
      },
    },
    ['username', 'password'],
  );
  if (result.action !== 'accept') return null;
  if (!result.content.username || !result.content.password) return null;
  return result.content;
}

// ── Step 3: 2FA ────────────────────────────────────────────────────────────

async function collect2FaCode(server: McpServer, deliveryHint?: string): Promise<string | null> {
  const message = deliveryHint
    ? `MyChart sent a 6-digit code ${deliveryHint}. Enter it below.`
    : 'MyChart needs a 6-digit verification code. Check your email/SMS and enter it below.';
  const result = await elicit<{ code: string }>(
    server,
    message,
    {
      code: {
        type: 'string',
        title: '6-digit code',
        minLength: 6,
        maxLength: 6,
      },
    },
    ['code'],
  );
  if (result.action !== 'accept') return null;
  const code = result.content.code?.trim() ?? '';
  if (!/^\d{6}$/.test(code)) return null;
  return code;
}

// ── Step 4: passkey opt-in ─────────────────────────────────────────────────

async function askPasskey(server: McpServer): Promise<boolean> {
  const result = await elicit<{ register: boolean }>(
    server,
    'Register a passkey for this account? With a passkey, future logins skip the password and 2FA prompts entirely.',
    {
      register: {
        type: 'boolean',
        title: 'Register a passkey?',
        description: 'Recommended. The passkey is stored locally on your machine (~/.openrecord-mcpb/passkeys/).',
        default: true,
      },
    },
    ['register'],
  );
  return result.action === 'accept' && !!result.content.register;
}

// ── Wizard entry ───────────────────────────────────────────────────────────

export async function runSetupFlow(server: McpServer): Promise<{
  ok: boolean;
  message: string;
  hostname?: string;
  passkeyRegistered?: boolean;
}> {
  // Step 1
  const picked = await pickInstance(server);
  if (!picked) return { ok: false, message: cancelMessage() };
  const hostname = 'hostname' in picked ? picked.hostname : (picked as Instance).hostname;
  const displayName = (picked as Instance).name || hostname;

  // Step 2
  const creds = await collectCredentials(server);
  if (!creds) return { ok: false, message: cancelMessage() };

  // Step 3 — attempt login
  let loginResult;
  try {
    loginResult = await myChartUserPassLogin({
      hostname,
      user: creds.username,
      pass: creds.password,
    });
  } catch (err) {
    return { ok: false, message: `Login error: ${(err as Error).message}` };
  }

  let session;
  if (loginResult.state === 'logged_in') {
    session = loginResult.mychartRequest;
  } else if (loginResult.state === 'invalid_login') {
    return { ok: false, message: `MyChart rejected those credentials for ${displayName}. Run setup_account again to retry.` };
  } else if (loginResult.state === 'need_2fa') {
    const code = await collect2FaCode(server);
    if (!code) return { ok: false, message: cancelMessage() };

    const twoFa = await complete2faFlow({
      mychartRequest: loginResult.mychartRequest,
      code,
      isTOTP: false,
    });
    if (twoFa.state !== 'logged_in') {
      return { ok: false, message: `2FA code was rejected (${twoFa.state}). Run setup_account again to retry.` };
    }
    session = twoFa.mychartRequest;
  } else {
    return { ok: false, message: `Login failed: ${loginResult.state}${loginResult.error ? ` — ${loginResult.error}` : ''}` };
  }

  // Persist account + session
  upsertAccount({
    hostname: normalizeHostname(hostname),
    username: creds.username,
    password: creds.password,
  });
  try { saveAccountSession(hostname, await session.serialize()); } catch { /* best-effort */ }

  // Step 4 — passkey opt-in
  let passkeyRegistered = false;
  const wantsPasskey = await askPasskey(server);
  if (wantsPasskey) {
    try {
      const credential = await setupPasskey(session);
      if (credential) {
        saveAccountPasskey(hostname, serializeCredential(credential));
        passkeyRegistered = true;
      }
    } catch (err) {
      // Non-fatal — account is still usable with user/pass + 2FA
      console.error(`[openrecord:${hostname}] passkey registration failed: ${(err as Error).message}`);
    }
  }

  // Optional: friendly confirmation using the patient's name
  let patientName = '';
  try {
    const profile = await getMyChartProfile(session);
    if (profile && typeof profile === 'object' && 'fullName' in profile) {
      const fn = (profile as { fullName?: string }).fullName;
      if (typeof fn === 'string') patientName = fn;
    }
    if (!patientName) await getEmail(session); // warm up next request
  } catch { /* ignore */ }

  // Confirm session still valid
  const stillValid = await areCookiesValid(session).catch(() => true);

  const lines = [
    `Connected to ${displayName} (${hostname}).`,
    patientName ? `Signed in as ${patientName}.` : '',
    passkeyRegistered
      ? 'Passkey registered — future logins will skip the password and 2FA prompts.'
      : 'No passkey saved — future logins will need the password (and 2FA if your account requires it).',
    !stillValid ? '(Session may have expired immediately — next tool call will re-login.)' : '',
    '',
    'You can now ask me about your medications, lab results, messages, visits, etc.',
  ].filter(Boolean);

  return {
    ok: true,
    message: lines.join('\n'),
    hostname,
    passkeyRegistered,
  };
}
