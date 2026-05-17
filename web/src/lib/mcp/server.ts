import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MyChartRequest } from '../mychart/myChartRequest';
import { sessionStore } from '../../../../scrapers/myChart/sessionStore';
import { sendTelemetryEvent } from '../../../../shared/telemetry';
import { getMyChartInstances, type MyChartInstance } from '../db';
import { autoConnectInstance } from './auto-connect';
import { complete2faFlow } from '../mychart/login';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { 
  registerAllTools, 
  type SessionProvider, 
  type TelemetryProvider,
  type Logger
} from './tool-registry';

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
  const allInstances = await getMyChartInstances(userId);
  const instances = allInstances.filter(i => i.enabled);

  if (instances.length === 0) {
    return { error: allInstances.length > 0
      ? 'All MyChart accounts are disabled. Enable one at the web app.'
      : 'No MyChart accounts configured. Add one at the web app.' };
  }

  function getConnected(): { instance: MyChartInstance; request: MyChartRequest }[] {
    const connected: { instance: MyChartInstance; request: MyChartRequest }[] = [];
    for (const inst of instances) {
      const sessionKey = `${userId}:${inst.id}`;
      const entry = sessionStore.getEntry(sessionKey);
      if (entry && entry.status === 'logged_in') {
        connected.push({ instance: inst, request: entry.request });
      }
    }
    return connected;
  }

  let connected = getConnected();

  if (connected.length === 0) {
    const pending2fa = instances.filter(inst => {
      const entry = sessionStore.getEntry(`${userId}:${inst.id}`);
      return entry?.status === 'need_2fa';
    });
    if (pending2fa.length > 0) {
      const labels = pending2fa.map(i => `${i.hostname}:${i.username}`);
      return { error: `MyChart is waiting for 2FA on: ${labels.join(', ')}. Use the complete_2fa tool with instance set to one of these to enter your code.` };
    }
  }

  if (connected.length === 0) {
    const autoConnectResults: { hostname: string; result: string }[] = [];
    for (const inst of instances) {
      const result = await autoConnectInstance(userId, inst);
      autoConnectResults.push({ hostname: inst.hostname, result: result.state });
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

  const match = pickInstance(connected, instanceHostname);
  if ('matchIndex' in match) {
    return { mychartRequest: connected[match.matchIndex].request, instance: connected[match.matchIndex].instance };
  }
  return { error: match.error };
}

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

    const suffix = notFoundContext === 'connected' ? 'Connected' : 'Available';
    return { error: `Instance '${instanceHostname}' not found or not ${notFoundContext}. ${suffix}: ${labelAll()}` };
  }

  if (items.length === 1) {
    return { matchIndex: 0 };
  }
  const suffix = notFoundContext === 'connected' ? 'Connected' : 'Available';
  return { error: `Multiple MyChart accounts ${notFoundContext}. Specify the 'instance' parameter (hostname or hostname:username) with one of: ${labelAll()}` };
}

export function pickInstance(
  connected: { instance: { hostname: string; username: string } }[],
  instanceHostname: string | undefined
): { matchIndex: number } | { error: string } {
  return pickByInstanceIdentifier(connected, instanceHostname, c => c.instance, 'connected');
}

class DbSessionProvider implements SessionProvider {
  constructor(private userId: string) {}

  async resolveRequest(instanceHostname?: string) {
    const result = await resolveRequest(this.userId, instanceHostname);
    if ('error' in result) return result;
    return {
      mychartRequest: result.mychartRequest,
      instance: { hostname: result.instance.hostname, username: result.instance.username }
    };
  }

  async listAccounts(): Promise<CallToolResult> {
    console.log(`[mcp] Tool call: list_accounts (user=${this.userId})`);
    try {
      const instances = await getMyChartInstances(this.userId);
      const accounts = instances.map(inst => {
        const sessionKey = `${this.userId}:${inst.id}`;
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
      return errorResult(`Error listing accounts: ${error.message}`);
    }
  }

  async connectInstance(instanceIdentifier: string): Promise<CallToolResult> {
    console.log(`[mcp] Tool call: connect_instance (user=${this.userId}, instance=${instanceIdentifier})`);
    try {
      const instances = await getMyChartInstances(this.userId);
      const pick = pickByInstanceIdentifier(instances, instanceIdentifier, i => ({ hostname: i.hostname, username: i.username }), 'configured');
      if ('error' in pick) return errorResult(pick.error);
      const inst = instances[pick.matchIndex];

      const result = await autoConnectInstance(this.userId, inst);
      return jsonResult({ status: result.state, hostname: inst.hostname, username: inst.username });
    } catch (err) {
      const error = err as Error;
      return errorResult(`Error connecting to ${instanceIdentifier}: ${error.message}`);
    }
  }

  async checkSession(instanceHostname?: string): Promise<CallToolResult> {
    console.log(`[mcp] Tool call: check_session (user=${this.userId}, instance=${instanceHostname || 'all'})`);
    try {
      const instances = await getMyChartInstances(this.userId);
      let toCheck: typeof instances;
      if (instanceHostname) {
        const pick = pickByInstanceIdentifier(instances, instanceHostname, i => ({ hostname: i.hostname, username: i.username }), 'configured');
        if ('error' in pick) return errorResult(pick.error);
        toCheck = [instances[pick.matchIndex]];
      } else {
        toCheck = instances;
      }

      const results = [];
      for (const inst of toCheck) {
        const sessionKey = `${this.userId}:${inst.id}`;
        const entry = sessionStore.getEntry(sessionKey);
        let cookiesValid = false;

        if (entry && entry.status === 'logged_in') {
          try {
            const resp = await entry.request.makeRequest({ path: '/Home', followRedirects: false });
            cookiesValid = resp.status === 200;
          } catch (err) {
            console.error(`[mcp] check_session: cookie validation failed for ${inst.hostname}:`, (err as Error).message);
          }
        }
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
      return errorResult(`Error checking session: ${error.message}`);
    }
  }

  async complete2fa(instanceHostname: string, code: string): Promise<CallToolResult> {
    console.log(`[mcp] Tool call: complete_2fa (user=${this.userId}, instance=${instanceHostname})`);
    try {
      const instances = await getMyChartInstances(this.userId);
      const pick = pickByInstanceIdentifier(instances, instanceHostname, i => ({ hostname: i.hostname, username: i.username }), 'configured');
      if ('error' in pick) return errorResult(pick.error);
      const inst = instances[pick.matchIndex];

      const sessionKey = `${this.userId}:${inst.id}`;
      const entry = sessionStore.getEntry(sessionKey);
      if (!entry) return errorResult('No pending 2FA session for this instance.');

      const result = await complete2faFlow({ mychartRequest: entry.request, code });
      if (result.state === 'logged_in') {
        const { setSession } = await import('../sessions');
        setSession(sessionKey, result.mychartRequest, { hostname: inst.hostname });
        return jsonResult({ status: 'logged_in', message: '2FA completed successfully', hostname: inst.hostname, username: inst.username });
      }
      return errorResult(`2FA failed: ${result.state}`);
    } catch (err) {
      const error = err as Error;
      return errorResult(`2FA error: ${error.message}`);
    }
  }
}

class DbTelemetryProvider implements TelemetryProvider {
  sendEvent(name: string, properties?: Record<string, unknown>) {
    sendTelemetryEvent(name as any, properties);
  }
}

class WebConsoleLogger implements Logger {
  info(message: string, ...args: any[]) {
    console.log(message, ...args);
  }
  error(message: string, ...args: any[]) {
    console.error(message, ...args);
  }
}

export function createMcpServer(userId: string): McpServer {
  sendTelemetryEvent('mcp_server_created');
  const server = new McpServer({
    name: 'openrecord',
    version: '1.0.0',
  });

  const sessionProvider = new DbSessionProvider(userId);
  const telemetryProvider = new DbTelemetryProvider();
  const logger = new WebConsoleLogger();

  registerAllTools(server, sessionProvider, telemetryProvider, undefined, logger);

  return server;
}
