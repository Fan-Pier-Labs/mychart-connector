/**
 * Full-stack integration tests: PostgreSQL + fake-mychart + scrapers.
 *
 * Requires services to be running:
 *   docker compose up -d
 *
 * Or run manually with env vars:
 *   DATABASE_URL=postgres://postgres:postgres@localhost:5432/mychart_test \
 *   ENCRYPTION_KEY=000...001 \
 *   BETTER_AUTH_SECRET=ci-test-secret-32chars-minimum-length \
 *   FAKE_MYCHART_HOST=localhost:4000 \
 *   cd web && bun test src/lib/__tests__/integration/full-stack.test.ts
 *
 * Tests soft-skip (return early) when DATABASE_URL is not set, so they
 * are safe to include in the regular test suite.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { Pool } from 'pg'
import { createMyChartInstance, getMyChartInstances, updateMyChartInstance, deleteMyChartInstance } from '../../db'
import { myChartUserPassLogin } from '../../mychart/login'
import { getMyChartProfile } from '../../mychart/profile'
import { getMedications } from '../../mychart/medications'
import { getAllergies } from '../../mychart/allergies'
import { getImmunizations } from '../../mychart/immunizations'
import { getHealthIssues } from '../../mychart/healthIssues'
import { getHealthSummary } from '../../mychart/healthSummary'
import { upcomingVisits, pastVisits } from '../../mychart/visits/visits'
import { listLabResults } from '../../mychart/labs/labResults'
import { listConversations } from '../../mychart/messages/conversations'
import { generateApiKey, hasApiKey, revokeApiKey } from '../../mcp/api-keys'

const DATABASE_URL = process.env.DATABASE_URL
const FAKE_MYCHART_HOST = process.env.FAKE_MYCHART_HOST ?? 'localhost:4000'
const hasServices = !!DATABASE_URL

let pool: Pool
let testUserId: string
let instanceId: string

beforeAll(async () => {
  if (!hasServices) return

  pool = new Pool({ connectionString: DATABASE_URL, ssl: false })
  testUserId = crypto.randomUUID()

  // Insert a test user directly. BetterAuth creates the "user" table via
  // runMigrations() on web startup. Column names follow snake_case convention.
  await pool.query(
    `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
     VALUES ($1, $2, $3, true, NOW(), NOW())`,
    [testUserId, 'CI Test User', `ci-${testUserId}@integration.test`]
  )
}, 30_000)

afterAll(async () => {
  if (!hasServices) return
  // ON DELETE CASCADE on mychart_instances means this cleans up everything
  await pool.query('DELETE FROM "user" WHERE id = $1', [testUserId])
  await pool.end()
})

describe('full-stack integration', () => {
  describe('credential storage (PostgreSQL + encryption)', () => {
    it('creates a mychart instance with encrypted credentials', async () => {
      if (!hasServices) return
      const instance = await createMyChartInstance(testUserId, {
        hostname: FAKE_MYCHART_HOST,
        username: 'homer',
        password: 'donuts123',
      })
      instanceId = instance.id
      expect(instance.hostname).toBe(FAKE_MYCHART_HOST)
      expect(instance.username).toBe('homer')
      // Password should be returned decrypted
      expect(instance.password).toBe('donuts123')
      expect(instance.userId).toBe(testUserId)
      expect(instance.totpSecret).toBeNull()
    }, 15_000)

    it('retrieves and decrypts credentials from the database', async () => {
      if (!hasServices) return
      const instances = await getMyChartInstances(testUserId)
      expect(instances.length).toBeGreaterThanOrEqual(1)
      const found = instances.find(i => i.id === instanceId)
      expect(found).toBeDefined()
      // Round-trip: encrypt on write, decrypt on read
      expect(found!.password).toBe('donuts123')
      expect(found!.hostname).toBe(FAKE_MYCHART_HOST)
    }, 10_000)
  })

  describe('scraper integration (fake-mychart + stored credentials)', () => {
    it('logs into fake-mychart using stored credentials', async () => {
      if (!hasServices) return
      const [instance] = await getMyChartInstances(testUserId)
      const result = await myChartUserPassLogin({
        hostname: instance.hostname,
        user: instance.username,
        pass: instance.password,
        protocol: 'http',
      })
      expect(result.state).toBe('logged_in')
    }, 30_000)

    it('getMyChartProfile returns Homer Simpson', async () => {
      if (!hasServices) return
      const [instance] = await getMyChartInstances(testUserId)
      const loginResult = await myChartUserPassLogin({
        hostname: instance.hostname,
        user: instance.username,
        pass: instance.password,
        protocol: 'http',
      })
      const profile = await getMyChartProfile(loginResult.mychartRequest)
      expect(profile).not.toBeNull()
      expect(profile!.name).toBe('Homer Jay Simpson')
      expect(profile!.dob).toBe('05/12/1956')
      expect(profile!.mrn).toBe('742')
      expect(profile!.pcp).toBe('Dr. Julius Hibbert, MD')
    }, 30_000)

    it('getMedications returns Homer medications', async () => {
      if (!hasServices) return
      const [instance] = await getMyChartInstances(testUserId)
      const loginResult = await myChartUserPassLogin({
        hostname: instance.hostname,
        user: instance.username,
        pass: instance.password,
        protocol: 'http',
      })
      const result = await getMedications(loginResult.mychartRequest)
      expect(result).toBeDefined()
      expect(Array.isArray(result.medications)).toBe(true)
      expect(result.medications.length).toBeGreaterThan(0)
      const names = result.medications.map((m: { name: string }) => m.name)
      expect(names.some((n: string) => n.includes('Duff Beer Extract'))).toBe(true)
    }, 30_000)

    it('listLabResults returns lab results', async () => {
      if (!hasServices) return
      const [instance] = await getMyChartInstances(testUserId)
      const loginResult = await myChartUserPassLogin({
        hostname: instance.hostname,
        user: instance.username,
        pass: instance.password,
        protocol: 'http',
      })
      const results = await listLabResults(loginResult.mychartRequest)
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
    }, 30_000)

    it('listConversations returns message conversations', async () => {
      if (!hasServices) return
      const [instance] = await getMyChartInstances(testUserId)
      const loginResult = await myChartUserPassLogin({
        hostname: instance.hostname,
        user: instance.username,
        pass: instance.password,
        protocol: 'http',
      })
      const result = await listConversations(loginResult.mychartRequest)
      expect(result).toBeDefined()
    }, 30_000)

    it('getAllergies returns allergy data', async () => {
      if (!hasServices) return
      const [instance] = await getMyChartInstances(testUserId)
      const loginResult = await myChartUserPassLogin({
        hostname: instance.hostname,
        user: instance.username,
        pass: instance.password,
        protocol: 'http',
      })
      const result = await getAllergies(loginResult.mychartRequest)
      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
    }, 30_000)

    it('getImmunizations returns immunization records', async () => {
      if (!hasServices) return
      const [instance] = await getMyChartInstances(testUserId)
      const loginResult = await myChartUserPassLogin({
        hostname: instance.hostname,
        user: instance.username,
        pass: instance.password,
        protocol: 'http',
      })
      const result = await getImmunizations(loginResult.mychartRequest)
      expect(result).toBeDefined()
    }, 30_000)

    it('getHealthIssues returns health issues list', async () => {
      if (!hasServices) return
      const [instance] = await getMyChartInstances(testUserId)
      const loginResult = await myChartUserPassLogin({
        hostname: instance.hostname,
        user: instance.username,
        pass: instance.password,
        protocol: 'http',
      })
      const result = await getHealthIssues(loginResult.mychartRequest)
      expect(result).toBeDefined()
    }, 30_000)

    it('getHealthSummary returns health summary', async () => {
      if (!hasServices) return
      const [instance] = await getMyChartInstances(testUserId)
      const loginResult = await myChartUserPassLogin({
        hostname: instance.hostname,
        user: instance.username,
        pass: instance.password,
        protocol: 'http',
      })
      const result = await getHealthSummary(loginResult.mychartRequest)
      expect(result).toBeDefined()
    }, 30_000)

    it('upcomingVisits returns upcoming visit data', async () => {
      if (!hasServices) return
      const [instance] = await getMyChartInstances(testUserId)
      const loginResult = await myChartUserPassLogin({
        hostname: instance.hostname,
        user: instance.username,
        pass: instance.password,
        protocol: 'http',
      })
      const result = await upcomingVisits(loginResult.mychartRequest)
      expect(result).toBeDefined()
    }, 30_000)

    it('pastVisits returns past visit data', async () => {
      if (!hasServices) return
      const [instance] = await getMyChartInstances(testUserId)
      const loginResult = await myChartUserPassLogin({
        hostname: instance.hostname,
        user: instance.username,
        pass: instance.password,
        protocol: 'http',
      })
      const result = await pastVisits(loginResult.mychartRequest)
      expect(result).toBeDefined()
    }, 30_000)
  })

  describe('instance CRUD', () => {
    let crudInstanceId: string

    it('creates a second instance for CRUD testing', async () => {
      if (!hasServices) return
      const instance = await createMyChartInstance(testUserId, {
        hostname: FAKE_MYCHART_HOST,
        username: 'crud_test_user',
        password: 'crud_test_pass',
      })
      crudInstanceId = instance.id
      expect(instance.username).toBe('crud_test_user')
    }, 15_000)

    it('updates instance username', async () => {
      if (!hasServices) return
      const updated = await updateMyChartInstance(crudInstanceId, testUserId, {
        username: 'updated_user',
      })
      expect(updated).not.toBeNull()
      expect(updated!.username).toBe('updated_user')
      expect(updated!.id).toBe(crudInstanceId)
    }, 10_000)

    it('updates instance password (re-encrypts)', async () => {
      if (!hasServices) return
      const updated = await updateMyChartInstance(crudInstanceId, testUserId, {
        password: 'new_password',
      })
      expect(updated).not.toBeNull()
      // Round-trip: password should decrypt to the new value
      expect(updated!.password).toBe('new_password')
    }, 10_000)

    it('returns null when updating non-existent instance', async () => {
      if (!hasServices) return
      const result = await updateMyChartInstance('00000000-0000-0000-0000-000000000000', testUserId, {
        username: 'ghost',
      })
      expect(result).toBeNull()
    }, 10_000)

    it('deletes instance successfully', async () => {
      if (!hasServices) return
      const deleted = await deleteMyChartInstance(crudInstanceId, testUserId)
      expect(deleted).toBe(true)
    }, 10_000)

    it('returns false when deleting already-deleted instance', async () => {
      if (!hasServices) return
      const deleted = await deleteMyChartInstance(crudInstanceId, testUserId)
      expect(deleted).toBe(false)
    }, 10_000)

    it('cannot delete another user\'s instance', async () => {
      if (!hasServices) return
      // Use the main test instance with a different userId
      const [instance] = await getMyChartInstances(testUserId)
      const deleted = await deleteMyChartInstance(instance.id, 'other-user-id')
      expect(deleted).toBe(false)
    }, 10_000)
  })

  describe('MCP API key management', () => {
    it('starts with no API key', async () => {
      if (!hasServices) return
      const exists = await hasApiKey(testUserId)
      expect(exists).toBe(false)
    }, 10_000)

    it('generates a 64-char hex API key', async () => {
      if (!hasServices) return
      const key = await generateApiKey(testUserId)
      expect(key).toHaveLength(64)
      expect(key).toMatch(/^[a-f0-9]{64}$/)
    }, 10_000)

    it('reports hasKey=true after generating', async () => {
      if (!hasServices) return
      const exists = await hasApiKey(testUserId)
      expect(exists).toBe(true)
    }, 10_000)

    it('generates a new key (replaces old)', async () => {
      if (!hasServices) return
      const key1 = await generateApiKey(testUserId)
      const key2 = await generateApiKey(testUserId)
      expect(key1).not.toBe(key2)
      expect(await hasApiKey(testUserId)).toBe(true)
    }, 10_000)

    it('revokes the API key', async () => {
      if (!hasServices) return
      await revokeApiKey(testUserId)
      const exists = await hasApiKey(testUserId)
      expect(exists).toBe(false)
    }, 10_000)
  })

  describe('MCP HTTP endpoint', () => {
    const WEB_BASE = `http://localhost:3000`

    it('rejects requests with no API key (401)', async () => {
      if (!hasServices) return
      const res = await fetch(`${WEB_BASE}/api/mcp`, { method: 'POST' })
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toMatch(/API key/i)
    }, 10_000)

    it('rejects requests with an invalid API key (401)', async () => {
      if (!hasServices) return
      const res = await fetch(`${WEB_BASE}/api/mcp?key=invalidkey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
      })
      expect(res.status).toBe(401)
    }, 10_000)
  })
})
