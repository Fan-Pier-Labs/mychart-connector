import { describe, it, expect } from 'bun:test'
import { createDemoMcpServer } from '../demo-server'
import { TOOL_DEFINITIONS } from '../tool-definitions'

type RegisteredTool = { description?: string };
type ToolRecord = Record<string, RegisteredTool>;

function getToolRecord(server: unknown): ToolRecord {
  return (server as { _registeredTools: ToolRecord })._registeredTools;
}

describe('tool parity', () => {
  const demoServer = createDemoMcpServer();
  const demoTools = getToolRecord(demoServer);
  const demoToolNames = new Set(Object.keys(demoTools));
  const definitionNames = new Set(TOOL_DEFINITIONS.map(t => t.name));

  it('TOOL_DEFINITIONS has no duplicate names', () => {
    const names = TOOL_DEFINITIONS.map(t => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('all demo server tools exist in TOOL_DEFINITIONS', () => {
    for (const name of demoToolNames) {
      expect(definitionNames.has(name)).toBe(true);
    }
  });

  it('all TOOL_DEFINITIONS are registered in demo server', () => {
    for (const name of definitionNames) {
      expect(demoToolNames.has(name)).toBe(true);
    }
  });

  it('demo server tool descriptions match TOOL_DEFINITIONS', () => {
    for (const [name, tool] of Object.entries(demoTools)) {
      const def = TOOL_DEFINITIONS.find(t => t.name === name);
      expect(def).toBeDefined();
      if (def && tool.description) {
        expect(tool.description).toBe(def.description);
      }
    }
  });
});
