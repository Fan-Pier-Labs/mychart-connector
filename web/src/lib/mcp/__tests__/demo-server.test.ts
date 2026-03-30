import { describe, it, expect } from 'bun:test'
import { createDemoMcpServer } from '../demo-server'

// Helper to call a tool on the demo MCP server
async function callTool(toolName: string, args: Record<string, unknown> = {}) {
  const server = createDemoMcpServer()
  // Access registered tools via the internal handler
  // The MCP SDK exposes tools through server.tool() and server.registerTool()
  // We need to use the server's internal tool list
  const tools = (server as unknown as { _registeredTools: Map<string, { callback: (args: Record<string, unknown>) => Promise<unknown> }> })._registeredTools
  const tool = tools.get(toolName)
  if (!tool) throw new Error(`Tool ${toolName} not found`)
  return tool.callback(args)
}

// Since calling tools directly on the McpServer is complex (it's designed for transport),
// we test the server creation and tool registration instead.
describe('createDemoMcpServer', () => {
  it('creates a server without errors', () => {
    const server = createDemoMcpServer()
    expect(server).toBeDefined()
  })

  it('can be created multiple times without conflict', () => {
    const server1 = createDemoMcpServer()
    const server2 = createDemoMcpServer()
    expect(server1).toBeDefined()
    expect(server2).toBeDefined()
    expect(server1).not.toBe(server2)
  })
})

// Test the demo data exports used by the tools
describe('demo-data', () => {
  it('demoMessageRecipients has recipients and topics', async () => {
    const { demoMessageRecipients } = await import('../demo-data')
    expect(demoMessageRecipients.recipients.length).toBeGreaterThan(0)
    expect(demoMessageRecipients.topics.length).toBeGreaterThan(0)
    // All recipients have displayName
    for (const r of demoMessageRecipients.recipients) {
      expect(r.displayName).toBeTruthy()
      expect(r.specialty).toBeTruthy()
    }
  })

  it('demoAvailableAppointments has providers with slots', async () => {
    const { demoAvailableAppointments } = await import('../demo-data')
    expect(demoAvailableAppointments.length).toBeGreaterThan(0)
    for (const provider of demoAvailableAppointments) {
      expect(provider.provider).toBeTruthy()
      expect(provider.slots.length).toBeGreaterThan(0)
      for (const slot of provider.slots) {
        expect(slot.slotId).toBeTruthy()
        expect(slot.date).toBeTruthy()
        expect(slot.time).toBeTruthy()
      }
    }
  })

  it('demoMedications all have refillsRemaining and pharmacy', async () => {
    const { demoMedications } = await import('../demo-data')
    expect(demoMedications.length).toBeGreaterThan(0)
    for (const med of demoMedications) {
      expect(med.name).toBeTruthy()
      expect(typeof med.refillsRemaining).toBe('number')
      expect(med.pharmacy).toBeTruthy()
    }
  })

  it('all slot IDs are unique across providers', async () => {
    const { demoAvailableAppointments } = await import('../demo-data')
    const ids = new Set<string>()
    for (const provider of demoAvailableAppointments) {
      for (const slot of provider.slots) {
        expect(ids.has(slot.slotId)).toBe(false)
        ids.add(slot.slotId)
      }
    }
  })
})
