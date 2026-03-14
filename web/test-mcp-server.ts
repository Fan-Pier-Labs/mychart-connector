#!/usr/bin/env npx tsx
/**
 * MCP Server Integration Test
 *
 * Usage:
 *   npx tsx test-mcp-server.ts <mcp-url>
 *
 * Example:
 *   npx tsx test-mcp-server.ts http://localhost:3000/api/mcp?session=abc-123
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const EXPECTED_TOOLS = [
  "check_session",
  "complete_2fa",
  "get_profile",
  "get_health_summary",
  "get_medications",
  "get_allergies",
  "get_health_issues",
  "get_upcoming_visits",
  "get_past_visits",
  "get_lab_results",
  "get_messages",
  "get_billing",
  "get_care_team",
  "get_insurance",
  "get_immunizations",
  "get_preventive_care",
  "get_referrals",
  "get_medical_history",
  "get_letters",
];

interface TestResult {
  name: string;
  passed: boolean;
  detail?: string;
  duration: number;
}

const results: TestResult[] = [];

function log(icon: string, msg: string) {
  console.log(`  ${icon} ${msg}`);
}

async function runTest(
  name: string,
  fn: () => Promise<string | undefined>
): Promise<boolean> {
  const start = Date.now();
  try {
    const detail = await fn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, detail, duration });
    log("PASS", `${name} (${duration}ms)${detail ? ` - ${detail}` : ""}`);
    return true;
  } catch (err) {
    const duration = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, detail: msg, duration });
    log("FAIL", `${name} (${duration}ms) - ${msg}`);
    return false;
  }
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: npx tsx test-mcp-server.ts <mcp-url>");
    console.error(
      "Example: npx tsx test-mcp-server.ts http://localhost:3000/api/mcp?session=abc-123"
    );
    process.exit(1);
  }

  console.log(`\nTesting MCP server: ${url}\n`);

  // --- 1. Connect ---
  const client = new Client(
    { name: "mcp-test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  const transport = new StreamableHTTPClientTransport(new URL(url));

  let connected = false;
  await runTest("Connect to server", async () => {
    await client.connect(transport);
    connected = true;
    const version = client.getServerVersion();
    return `${version?.name} v${version?.version}`;
  });

  if (!connected) {
    console.log("\nCannot continue - connection failed.\n");
    printSummary();
    process.exit(1);
  }

  // --- 2. Server info ---
  await runTest("Server identifies as mychart-health", async () => {
    const version = client.getServerVersion();
    if (version?.name !== "mychart-health") {
      throw new Error(`Expected "mychart-health", got "${version?.name}"`);
    }
    return undefined;
  });

  // --- 3. List tools ---
  let toolNames: string[] = [];
  await runTest("List tools", async () => {
    const { tools } = await client.listTools();
    toolNames = tools.map((t) => t.name);
    return `${tools.length} tools`;
  });

  // --- 4. Verify expected tools ---
  await runTest("All expected tools present", async () => {
    const missing = EXPECTED_TOOLS.filter((t) => !toolNames.includes(t));
    if (missing.length > 0) {
      throw new Error(`Missing tools: ${missing.join(", ")}`);
    }
    const extra = toolNames.filter((t) => !EXPECTED_TOOLS.includes(t));
    if (extra.length > 0) {
      return `+ extra tools: ${extra.join(", ")}`;
    }
    return undefined;
  });

  // --- 5. Tool schemas ---
  await runTest("All tools have descriptions", async () => {
    const { tools } = await client.listTools();
    const noDesc = tools.filter((t) => !t.description);
    if (noDesc.length > 0) {
      throw new Error(
        `Tools without descriptions: ${noDesc.map((t) => t.name).join(", ")}`
      );
    }
    return undefined;
  });

  // --- 6. check_session ---
  let sessionStatus: string | undefined;
  await runTest("Call check_session", async () => {
    const result = await client.callTool({
      name: "check_session",
      arguments: {},
    });
    const text =
      result.content &&
      Array.isArray(result.content) &&
      result.content[0] &&
      "text" in result.content[0]
        ? result.content[0].text
        : undefined;
    if (!text) throw new Error("No text content returned");
    if (result.isError) throw new Error(`Tool error: ${text}`);
    const data = JSON.parse(text);
    sessionStatus = data.status;
    return `status=${data.status}, hostname=${data.hostname}`;
  });

  // --- 7. Call a scraper tool if logged in ---
  if (sessionStatus === "logged_in") {
    await runTest("Call get_profile (live session)", async () => {
      const result = await client.callTool({
        name: "get_profile",
        arguments: {},
      });
      const text =
        result.content &&
        Array.isArray(result.content) &&
        result.content[0] &&
        "text" in result.content[0]
          ? result.content[0].text
          : undefined;
      if (!text) throw new Error("No text content returned");
      if (result.isError) throw new Error(`Tool error: ${text}`);
      const data = JSON.parse(text);
      if (!data.name && !data.firstName) {
        throw new Error("Profile missing name field");
      }
      return `name=${data.name || data.firstName}`;
    });

    // Call a few more tools to exercise the scraper layer
    const quickTools = [
      "get_allergies",
      "get_medications",
      "get_health_issues",
    ];
    for (const toolName of quickTools) {
      await runTest(`Call ${toolName}`, async () => {
        const result = await client.callTool({
          name: toolName,
          arguments: {},
        });
        const text =
          result.content &&
          Array.isArray(result.content) &&
          result.content[0] &&
          "text" in result.content[0]
            ? result.content[0].text
            : undefined;
        if (!text) throw new Error("No text content returned");
        if (result.isError) throw new Error(`Tool error: ${text}`);
        const data = JSON.parse(text);
        const count = Array.isArray(data) ? data.length : "object";
        return `returned ${count} items`;
      });
    }
  } else {
    log(
      "SKIP",
      `Skipping scraper tests (session status: ${sessionStatus || "unknown"})`
    );
  }

  // --- 8. Ping ---
  await runTest("Ping server", async () => {
    await client.ping();
    return undefined;
  });

  // --- 9. Disconnect ---
  await runTest("Disconnect cleanly", async () => {
    await client.close();
    return undefined;
  });

  printSummary();
}

function printSummary() {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalTime = results.reduce((s, r) => s + r.duration, 0);

  console.log(`\n${"=".repeat(50)}`);
  console.log(
    `  ${passed} passed, ${failed} failed (${totalTime}ms total)`
  );
  console.log(`${"=".repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
