#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  registerAllTools, 
  type SessionProvider, 
  type MyChartRequest,
  type ImagingProvider,
  type Logger
} from '../../web/src/lib/mcp/tool-registry';
import { 
  loadInstances, 
  loadInstance, 
  saveInstance, 
  saveSession, 
  loadSession,
  deleteSession,
  type DiskInstance 
} from './credential-store';
import { MyChartRequest as MyChartRequestImpl } from '../../web/src/lib/mychart/myChartRequest';
import { 
  myChartUserPassLogin, 
  myChartPasskeyLogin, 
  complete2faFlow, 
  deserializeCredential, 
  serializeCredential,
  setupPasskey 
} from '../../web/src/lib/mychart/login';
import { pickByInstanceIdentifier } from '../../web/src/lib/mcp/server';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { encodeGrayscaleToJpg } from './imaging/jpeg-encoder';

class DiskImagingProvider implements ImagingProvider {
  async encodeToJpg(pixels: Uint8Array, width: number, height: number): Promise<Buffer> {
    return encodeGrayscaleToJpg(pixels, width, height);
  }
}

class StdioLogger implements Logger {
  info(message: string, ...args: any[]) {
    console.error(message, ...args);
  }
  error(message: string, ...args: any[]) {
    console.error(message, ...args);
  }
}

class DiskSessionProvider implements SessionProvider {
  // In-memory cache for active requests
  private activeSessions = new Map<string, { request: MyChartRequest; status: string }>();

  async resolveRequest(instanceHostname?: string) {
    const instances = await loadInstances();
    const enabled = instances.filter(i => i.enabled);

    if (enabled.length === 0) {
      return { error: 'No MyChart accounts configured. Use the setup_account tool or add JSON files to ~/.openrecord-mcpb/instances/' };
    }

    const match = pickByInstanceIdentifier(enabled, instanceHostname, i => ({ hostname: i.hostname, username: i.username }));
    if ('error' in match) return match;

    const inst = enabled[match.matchIndex];
    const sessionKey = `${inst.hostname}:${inst.username}`;

    // 1. Check in-memory cache
    const existing = this.activeSessions.get(sessionKey);
    if (existing && existing.status === 'logged_in') {
      return { mychartRequest: existing.request, instance: { hostname: inst.hostname, username: inst.username } };
    }

    // 2. Check disk cache
    const cookies = await loadSession(inst.hostname, inst.username);
    if (cookies) {
      const req = new MyChartRequestImpl(inst.hostname);
      req.addCookies(cookies);
      try {
        const resp = await req.makeRequest({ path: '/Home', followRedirects: false });
        if (resp.status === 200) {
          this.activeSessions.set(sessionKey, { request: req, status: 'logged_in' });
          return { mychartRequest: req, instance: { hostname: inst.hostname, username: inst.username } };
        }
      } catch (err) {
        console.error(`[mcpb] session validation failed for ${inst.hostname}:`, err);
      }
    }

    // 3. Try auto-connect (passkey then password)
    const result = await this.autoConnect(inst);
    if (result.status === 'logged_in' && result.request) {
      return { mychartRequest: result.request, instance: { hostname: inst.hostname, username: inst.username } };
    }

    return { error: `Session for ${inst.hostname} expired or requires 2FA. Use connect_instance.` };
  }

  private async autoConnect(inst: DiskInstance): Promise<{ status: string; request?: MyChartRequest }> {
    const sessionKey = `${inst.hostname}:${inst.username}`;

    // ── Try passkey login first ──
    if (inst.passkeyCredential) {
      try {
        const credential = deserializeCredential(inst.passkeyCredential);
        const passkeyResult = await myChartPasskeyLogin({
          hostname: inst.hostname,
          credential,
        });

        if (passkeyResult.state === 'logged_in') {
          const req = passkeyResult.mychartRequest;
          this.activeSessions.set(sessionKey, { request: req, status: 'logged_in' });
          await saveSession(inst.hostname, inst.username, req.getCookies());
          // Update signCount
          inst.passkeyCredential = serializeCredential(credential);
          await saveInstance(inst);
          return { status: 'logged_in', request: req };
          }
          } catch (err) {
          console.error(`[mcpb] passkey login failed for ${inst.hostname}:`, (err as Error).message);
          }
          }

          // ── Fall back to username/password ──
          if (inst.password) {
          try {
          const loginResult = await myChartUserPassLogin({
          hostname: inst.hostname,
          user: inst.username,
          pass: inst.password,
          skipSendCode: !!inst.totpSecret,
          });

          if (loginResult.state === 'logged_in') {
          const req = loginResult.mychartRequest;
          this.activeSessions.set(sessionKey, { request: req, status: 'logged_in' });
          await saveSession(inst.hostname, inst.username, req.getCookies());
          return { status: 'logged_in', request: req };
          }

          if (loginResult.state === 'need_2fa') {
          if (inst.totpSecret) {
            const { generateTotpCode } = await import('../../web/src/lib/mychart/totp');
            const code = await generateTotpCode(inst.totpSecret);
            const twofaResult = await complete2faFlow({
              mychartRequest: loginResult.mychartRequest,
              code,
              isTOTP: true,
            });

            if (twofaResult.state === 'logged_in') {
              const req = twofaResult.mychartRequest;
              this.activeSessions.set(sessionKey, { request: req, status: 'logged_in' });
              await saveSession(inst.hostname, inst.username, req.getCookies());
              return { status: 'logged_in', request: req };
            }
          }

          // Store partial session for manual 2FA completion
          this.activeSessions.set(sessionKey, { request: loginResult.mychartRequest, status: 'need_2fa' });
          return { status: 'need_2fa' };
          }
          } catch (err) {
          console.error(`[mcpb] login failed for ${inst.hostname}:`, (err as Error).message);
          }
          }
    return { status: 'error' };
  }

  async listAccounts(): Promise<CallToolResult> {
    const instances = await loadInstances();
    const accounts = instances.map(inst => {
      const session = this.activeSessions.get(`${inst.hostname}:${inst.username}`);
      return {
        hostname: inst.hostname,
        username: inst.username,
        connected: session?.status === 'logged_in',
        hasTotpSecret: !!inst.totpSecret,
        hasPasskeyCredential: !!inst.passkeyCredential,
        enabled: inst.enabled,
      };
    });
    return { content: [{ type: 'text', text: JSON.stringify(accounts, null, 2) }] };
  }

  async connectInstance(instanceIdentifier: string): Promise<CallToolResult> {
    const instances = await loadInstances();
    const match = pickByInstanceIdentifier(instances, instanceIdentifier, i => ({ hostname: i.hostname, username: i.username }), 'configured');
    if ('error' in match) return { content: [{ type: 'text', text: match.error }], isError: true };
    const inst = instances[match.matchIndex];

    const result = await this.autoConnect(inst);
    return { content: [{ type: 'text', text: JSON.stringify({ status: result.status, hostname: inst.hostname, username: inst.username }, null, 2) }] };
  }

  async checkSession(instanceHostname?: string): Promise<CallToolResult> {
    const instances = await loadInstances();
    let toCheck = instances;
    if (instanceHostname) {
      const match = pickByInstanceIdentifier(instances, instanceHostname, i => ({ hostname: i.hostname, username: i.username }), 'configured');
      if ('error' in match) return { content: [{ type: 'text', text: match.error }], isError: true };
      toCheck = [instances[match.matchIndex]];
    }

    const results = [];
    for (const inst of toCheck) {
      const sessionKey = `${inst.hostname}:${inst.username}`;
      const session = this.activeSessions.get(sessionKey);
      let cookiesValid = false;

      if (session?.status === 'logged_in') {
        try {
          const resp = await session.request.makeRequest({ path: '/Home', followRedirects: false });
          cookiesValid = resp.status === 200;
        } catch {}
      }
      results.push({
        hostname: inst.hostname,
        username: inst.username,
        connected: session?.status === 'logged_in',
        cookiesValid,
      });
    }
    return { content: [{ type: 'text', text: JSON.stringify(results.length === 1 ? results[0] : results, null, 2) }] };
  }

  async complete2fa(instanceHostname: string, code: string): Promise<CallToolResult> {
    const instances = await loadInstances();
    const match = pickByInstanceIdentifier(instances, instanceHostname, i => ({ hostname: i.hostname, username: i.username }), 'configured');
    if ('error' in match) return { content: [{ type: 'text', text: match.error }], isError: true };
    const inst = instances[match.matchIndex];

    const sessionKey = `${inst.hostname}:${inst.username}`;
    const session = this.activeSessions.get(sessionKey);
    if (!session || session.status !== 'need_2fa') {
      return { content: [{ type: 'text', text: 'No pending 2FA session for this instance.' }], isError: true };
    }

    try {
      const result = await complete2faFlow({ mychartRequest: session.request, code });
      if (result.state === 'logged_in') {
        const req = result.mychartRequest;
        this.activeSessions.set(sessionKey, { request: req, status: 'logged_in' });
        await saveSession(inst.hostname, inst.username, req.getCookies());

        // Try registering a passkey automatically for future skip-2FA
        let message = '2FA completed successfully. Future sessions will auto-login.';
        try {
          const passkey = await setupPasskey(req);
          if (passkey) {
            inst.passkeyCredential = serializeCredential(passkey);
            await saveInstance(inst);
            message = '2FA completed successfully and a passkey was registered. Future sessions will skip 2FA.';
          }
        } catch (err) {
          console.error(`[mcpb] Failed to register passkey:`, err);
        }

        return { content: [{ type: 'text', text: JSON.stringify({ status: 'logged_in', message, hostname: inst.hostname, username: inst.username }, null, 2) }] };
      }
      return { content: [{ type: 'text', text: `2FA failed: ${result.state}` }], isError: true };
    } catch (err) {
      return { content: [{ type: 'text', text: `2FA error: ${(err as Error).message}` }], isError: true };
    }
  }

  async setupAccount(args: { hostname: string; username: string; password?: string }): Promise<CallToolResult> {
    const { hostname, username, password } = args;
    if (!password) return { content: [{ type: 'text', text: 'Password is required for setup.' }], isError: true };

    console.error(`[mcpb] Tool call: setup_account (hostname=${hostname}, username=${username})`);

    // Save basic info first
    const inst: DiskInstance = { hostname, username, password, enabled: true };
    await saveInstance(inst);

    // Attempt login to check if it works (and handle 2FA)
    const result = await this.autoConnect(inst);

    if (result.status === 'logged_in' && result.request) {
      // Try registering a passkey automatically for future skip-2FA
      let message = `Successfully connected to ${hostname}. Future sessions will auto-login via saved credentials.`;
      try {
        const passkey = await setupPasskey(result.request);
        if (passkey) {
          inst.passkeyCredential = serializeCredential(passkey);
          await saveInstance(inst);
          message = `Successfully connected to ${hostname} and registered a passkey. Future sessions will skip 2FA.`;
        }
      } catch (err) {
        console.error(`[mcpb] Failed to register passkey:`, err);
      }
      return { content: [{ type: 'text', text: message }] };
    }
    if (result.status === 'need_2fa') {
      return { content: [{ type: 'text', text: `Successfully configured ${hostname}, but 2FA is required. Please call complete_2fa tool with the code from your email/text.` }] };
    }

    return { content: [{ type: 'text', text: `Failed to connect to ${hostname}. Please verify your credentials. We have saved the configuration anyway.` }], isError: true };
  }
}


const server = new McpServer({
  name: 'openrecord',
  version: '0.1.0',
});

const sessionProvider = new DiskSessionProvider();
const imagingProvider = new DiskImagingProvider();
const logger = new StdioLogger();
registerAllTools(server, sessionProvider, undefined, imagingProvider, logger);

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('OpenRecord MCP server running on stdio');
}

run().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});
