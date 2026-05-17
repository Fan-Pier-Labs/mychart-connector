#!/usr/bin/env node
/**
 * OpenRecord MCPB — Claude Desktop Extension entry point.
 *
 * Stdio MCP server that speaks the 2025-06-18 protocol (so it can use
 * elicitation). Delegates all tool implementation to ./tools.ts; the
 * setup wizard is in ./setup-flow.ts; session management in ./session-manager.ts.
 *
 * The bundle is run by Claude Desktop as `node dist/server.cjs`. No
 * user_config is required — all auth happens via the in-chat setup_account
 * tool, which uses MCP elicitation to deterministically collect each field
 * (instance picker → username + password → 2FA → passkey opt-in).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools } from './tools';
import { clearAllSessions } from './session-manager';

async function main(): Promise<void> {
  const server = new McpServer(
    {
      name: 'openrecord',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
        // Required so Claude Desktop knows the server may send
        // elicitation/create requests during a tool call.
        elicitation: {},
      },
      instructions:
        'OpenRecord connects this conversation to the user\'s MyChart patient portal. ' +
        'If the user has not set up an account yet, call setup_account — it walks them through ' +
        'picking their MyChart, signing in, completing 2FA, and registering a passkey for ' +
        'passwordless future logins. After setup, every other tool just works: get_medications, ' +
        'get_lab_results, get_messages, send_message, request_refill, etc.',
    },
  );

  registerAllTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Clean up keepalive timers when the parent (Claude Desktop) closes stdio.
  const shutdown = () => {
    clearAllSessions();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.stdin.on('close', shutdown);
}

main().catch(err => {
  console.error('[openrecord] fatal:', err);
  process.exit(1);
});
