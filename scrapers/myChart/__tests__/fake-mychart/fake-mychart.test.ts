/**
 * Integration tests that run all scrapers against the fake-mychart server.
 *
 * The fake-mychart Next.js server must be running on localhost:4000 before
 * these tests are executed. In CI this is handled by the workflow; locally
 * run `cd fake-mychart && bun run dev` first.
 *
 * Run with: bun test scrapers/myChart/__tests__/fake-mychart/
 */

import { describe, it, expect, beforeAll } from 'bun:test'
import { MyChartRequest } from '../../myChartRequest'
import { myChartUserPassLogin } from '../../login'

// Scrapers
import { getMyChartProfile, getEmail } from '../../profile'
import { getHealthSummary } from '../../healthSummary'
import { getMedications } from '../../medications'
import { getAllergies } from '../../allergies'
import { getHealthIssues } from '../../healthIssues'
import { getImmunizations } from '../../immunizations'
import { getVitals } from '../../vitals'
import { getInsurance } from '../../insurance'
import { getCareTeam } from '../../careTeam'
import { getReferrals } from '../../referrals'
import { getMedicalHistory } from '../../medicalHistory'
import { getPreventiveCare } from '../../preventiveCare'
import { getLetters } from '../../letters'
import { getEmergencyContacts } from '../../emergencyContacts'
import { getGoals } from '../../goals'
import { getDocuments } from '../../documents'
import { getUpcomingOrders } from '../../upcomingOrders'
import { getQuestionnaires } from '../../questionnaires'
import { getCareJourneys } from '../../careJourneys'
import { getActivityFeed } from '../../activityFeed'
import { getEducationMaterials } from '../../educationMaterials'
import { getEhiExportTemplates } from '../../ehiExport'
import { upcomingVisits, pastVisits } from '../../visits/visits'
import { listLabResults } from '../../labs_and_procedure_results/labResults'
import { getBillingHistory } from '../../bills/bills'
import { listConversations } from '../../messages/conversations'

const HOST = process.env.FAKE_MYCHART_HOST ?? 'localhost:4000'

let session: MyChartRequest

beforeAll(async () => {
  const result = await myChartUserPassLogin({
    hostname: HOST,
    user: 'homer',
    pass: 'donuts123',
    protocol: 'http',
  })
  expect(result.state).toBe('logged_in')
  session = result.mychartRequest
}, 30_000)

describe('fake-mychart integration', () => {
  it('login sets firstPathPart to MyChart', () => {
    expect(session.firstPathPart).toBe('MyChart')
  })

  it('getMyChartProfile returns Homer Simpson', async () => {
    const result = await getMyChartProfile(session)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Homer Jay Simpson')
    expect(result!.dob).toBe('05/12/1956')
    expect(result!.mrn).toBe('742')
    expect(result!.pcp).toBe('Dr. Julius Hibbert, MD')
  }, 10_000)

  it('getEmail returns email', async () => {
    const result = await getEmail(session)
    expect(result).not.toBeNull()
    expect(result).toContain('@')
  }, 10_000)

  it('getHealthSummary returns Homer data', async () => {
    const result = await getHealthSummary(session)
    expect(result).toBeDefined()
    expect(result.patientAge).toBe('69')
    expect(result.bloodType).toBe('O+')
    expect(result.patientFirstName).toBe('Homer')
  }, 10_000)

  it('getMedications returns medications', async () => {
    const result = await getMedications(session)
    expect(result).toBeDefined()
    expect(Array.isArray(result.medications)).toBe(true)
    expect(result.medications.length).toBeGreaterThan(0)
    expect(result.patientFirstName).toBe('Homer')
    const names = result.medications.map((m: { name: string }) => m.name)
    expect(names).toContain('Duff Beer Extract 500mg')
  }, 10_000)

  it('getAllergies returns allergies', async () => {
    const result = await getAllergies(session)
    expect(result).toBeDefined()
    expect(Array.isArray(result.allergies)).toBe(true)
    expect(result.allergies.length).toBeGreaterThan(0)
    const names = result.allergies.map((a: { name: string }) => a.name)
    expect(names).toContain('Vegetables')
  }, 10_000)

  it('getHealthIssues returns health issues', async () => {
    const result = await getHealthIssues(session)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    const names = result.map((h: { name: string }) => h.name)
    expect(names).toContain('Obesity')
  }, 10_000)

  it('getImmunizations returns immunizations', async () => {
    const result = await getImmunizations(session)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  }, 10_000)

  it('getVitals returns vitals', async () => {
    const result = await getVitals(session)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  }, 10_000)

  it('getInsurance returns insurance data', async () => {
    const result = await getInsurance(session)
    expect(result).toBeDefined()
    expect(Array.isArray(result.coverages)).toBe(true)
    expect(result.coverages.length).toBeGreaterThan(0)
    expect(result.hasCoverages).toBe(true)
  }, 10_000)

  it('getCareTeam returns care team members', async () => {
    const result = await getCareTeam(session)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  }, 10_000)

  it('getReferrals returns referrals', async () => {
    const result = await getReferrals(session)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  }, 10_000)

  it('getMedicalHistory returns structured history', async () => {
    const result = await getMedicalHistory(session)
    expect(result).toBeDefined()
    expect(result.medicalHistory).toBeDefined()
    expect(result.surgicalHistory).toBeDefined()
    expect(result.familyHistory).toBeDefined()
    expect(Array.isArray(result.medicalHistory.diagnoses)).toBe(true)
    expect(Array.isArray(result.surgicalHistory.surgeries)).toBe(true)
    expect(Array.isArray(result.familyHistory.familyMembers)).toBe(true)
  }, 10_000)

  it('getPreventiveCare returns items', async () => {
    const result = await getPreventiveCare(session)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  }, 10_000)

  it('getLetters returns letters', async () => {
    const result = await getLetters(session)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  }, 10_000)

  it('getEmergencyContacts returns contacts', async () => {
    const result = await getEmergencyContacts(session)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  }, 10_000)

  it('getGoals returns goals', async () => {
    const result = await getGoals(session)
    expect(result).toBeDefined()
    expect(Array.isArray(result.careTeamGoals)).toBe(true)
    expect(Array.isArray(result.patientGoals)).toBe(true)
    expect(result.careTeamGoals.length).toBeGreaterThan(0)
    expect(result.patientGoals.length).toBeGreaterThan(0)
  }, 10_000)

  it('getDocuments returns documents', async () => {
    const result = await getDocuments(session)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  }, 10_000)

  it('getUpcomingOrders returns orders', async () => {
    const result = await getUpcomingOrders(session)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  }, 10_000)

  it('getQuestionnaires returns questionnaires', async () => {
    const result = await getQuestionnaires(session)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  }, 10_000)

  it('getCareJourneys returns care journeys', async () => {
    const result = await getCareJourneys(session)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  }, 10_000)

  it('getActivityFeed returns feed items', async () => {
    const result = await getActivityFeed(session)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  }, 10_000)

  it('getEducationMaterials returns materials', async () => {
    const result = await getEducationMaterials(session)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  }, 10_000)

  it('getEhiExportTemplates returns templates', async () => {
    const result = await getEhiExportTemplates(session)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  }, 10_000)

  it('upcomingVisits returns visit data', async () => {
    const result = await upcomingVisits(session)
    expect(result).toBeDefined()
  }, 10_000)

  it('pastVisits returns visit data', async () => {
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    const result = await pastVisits(session, twoYearsAgo)
    expect(result).toBeDefined()
  }, 10_000)

  it('listLabResults returns lab results', async () => {
    const result = await listLabResults(session)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  }, 30_000)

  it('listConversations returns conversations', async () => {
    const result = await listConversations(session)
    expect(result).toBeDefined()
  }, 10_000)

  it('getBillingHistory returns billing data', async () => {
    const result = await getBillingHistory(session)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  }, 30_000)
})
