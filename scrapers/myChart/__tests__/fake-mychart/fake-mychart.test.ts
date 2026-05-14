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
import { getEmergencyContacts, addEmergencyContact, updateEmergencyContact, removeEmergencyContact } from '../../emergencyContacts'
import { getGoals } from '../../goals'
import { getDocuments } from '../../documents'
import { getUpcomingOrders } from '../../upcomingOrders'
import { getQuestionnaires } from '../../questionnaires'
import { getCareJourneys } from '../../careJourneys'
import { getActivityFeed } from '../../activityFeed'
import { getEducationMaterials } from '../../educationMaterials'
import { getEhiExportTemplates } from '../../ehiExport'
import { upcomingVisits, pastVisits } from '../../visits/visits'
import { getVisitNotes, getNoteContent, getVisitAVS } from '../../notes/notes'
import { listLabResults } from '../../labs_and_procedure_results/labResults'
import { getBillingHistory } from '../../bills/bills'
import { listConversations } from '../../messages/conversations'
import { requestMedicationRefill } from '../../medicationRefill'
import { getImagingResults } from '../../labs_and_procedure_results/labResults'
import { followSamlChain } from '../../eunity/imagingViewer'
import { downloadImagingStudyDirect } from '../../eunity/imagingDirectDownload'

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
    expect(result[0].name).toBe('Marge Simpson')
    expect(result[0].id).toBeDefined()
  }, 10_000)

  it('addEmergencyContact adds a new contact', async () => {
    const result = await addEmergencyContact(session, {
      name: 'Ned Flanders',
      relationshipType: 'Neighbor',
      phoneNumber: '(555) 636-2900',
    })
    expect(result.success).toBe(true)

    const contacts = await getEmergencyContacts(session)
    const ned = contacts.find(c => c.name === 'Ned Flanders')
    expect(ned).toBeDefined()
    expect(ned!.relationshipType).toBe('Neighbor')
    expect(ned!.phoneNumber).toBe('(555) 636-2900')
  }, 10_000)

  it('updateEmergencyContact updates an existing contact', async () => {
    const contacts = await getEmergencyContacts(session)
    const barney = contacts.find(c => c.name === 'Barney Gumble')
    expect(barney).toBeDefined()

    const result = await updateEmergencyContact(session, {
      id: barney!.id!,
      phoneNumber: '(555) 999-0000',
    })
    expect(result.success).toBe(true)

    const updated = await getEmergencyContacts(session)
    const updatedBarney = updated.find(c => c.name === 'Barney Gumble')
    expect(updatedBarney!.phoneNumber).toBe('(555) 999-0000')
  }, 10_000)

  it('removeEmergencyContact removes a contact', async () => {
    const contacts = await getEmergencyContacts(session)
    const ned = contacts.find(c => c.name === 'Ned Flanders')
    expect(ned).toBeDefined()

    const result = await removeEmergencyContact(session, ned!.id!)
    expect(result.success).toBe(true)

    const after = await getEmergencyContacts(session)
    expect(after.find(c => c.name === 'Ned Flanders')).toBeUndefined()
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

  it('getVisitNotes returns the 3 ED notes for the Donut Incident visit', async () => {
    const result = await getVisitNotes(session, 'CSN-HOMER-003')
    expect(result.csn).toBe('CSN-HOMER-003')
    expect(result.lrpId).toBe('LRP-HOMER-003')
    expect(result.depPhoneNumber).toBe('555-0123')
    expect(result.notes.length).toBe(3)
    const titles = result.notes.map(n => n.displayName).sort()
    expect(titles).toEqual(['Discharge Summary', 'ED Provider Note', 'ED Triage Note'])

    // Verify per-note normalization: scraper reads uppercase wire keys
    // (hnoID/hnoDAT/magicID) and emits camelCase. Regression-proof the casing.
    const triage = result.notes.find(n => n.displayName === 'ED Triage Note')!
    expect(triage.hnoId).toBe('HNO-HOMER-003-A')
    expect(triage.hnoDat).toBe('67890')
    expect(triage.iso).toBe('2025-11-20T14:15:00Z')
    expect(triage.isAddendum).toBe(false)
    expect(triage.isNoteSensitive).toBe(false)
    expect(triage.providerName).toBe('Nick Riviera, MD')
    expect(triage.providerMagicId).toBe('PROV-NICK')
  }, 10_000)

  it('getVisitNotes returns an empty list for a visit with no notes', async () => {
    const result = await getVisitNotes(session, 'CSN-HOMER-004')
    expect(result.csn).toBe('CSN-HOMER-004')
    expect(result.notes.length).toBe(0)
  }, 10_000)

  it('getNoteContent returns the ED Provider note body', async () => {
    const notes = await getVisitNotes(session, 'CSN-HOMER-003')
    const provNote = notes.notes.find(n => n.displayName === 'ED Provider Note')
    expect(provNote).toBeDefined()
    const content = await getNoteContent(session, {
      csn: 'CSN-HOMER-003',
      lrpId: notes.lrpId,
      hnoId: provNote!.hnoId,
      hnoDat: provNote!.hnoDat,
    })
    expect(content.contentHtml).toContain('Nick Riviera')
    expect(content.contentHtml).toContain('gastric distention')
    expect(content.contentCss).toBe('')
  }, 10_000)

  it('getVisitAVS returns the AVS for the annual physical', async () => {
    const result = await getVisitAVS(session, 'CSN-HOMER-002')
    expect(result.contentHtml).toContain('After Visit Summary')
    expect(result.contentHtml).toContain('Hibbert')
    expect(result.contentHtml).toContain('Annual Physical')
    expect(result.contentCss).toBe('')
  }, 10_000)

  it('getVisitAVS returns the radiation-screening AVS for CSN-HOMER-004', async () => {
    const result = await getVisitAVS(session, 'CSN-HOMER-004')
    expect(result.contentHtml).toContain('Radiation Exposure Screening')
    expect(result.contentHtml).toContain('Sector 7G')
    expect(result.contentCss).toBe('')
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

  it('requestMedicationRefill succeeds', async () => {
    const result = await requestMedicationRefill(session, 'FAKE-MED-KEY-001')
    expect(result.success).toBe(true)
  }, 10_000)

  it('getImagingResults returns X-ray and CT studies with report text', async () => {
    const result = await getImagingResults(session)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThanOrEqual(2)

    // X-ray result
    const xray = result.find(r => r.orderName.includes('XR'))
    expect(xray).toBeDefined()
    expect(xray!.reportText).toContain('Calvarium')
    expect(xray!.fdiContext).toBeDefined()
    expect(xray!.fdiContext!.fdi).toBe('FDI-XRAY-001')
    expect(xray!.samlUrl).toBeDefined()

    // CT result
    const ct = result.find(r => r.orderName.includes('CT'))
    expect(ct).toBeDefined()
    expect(ct!.reportText).toContain('crayon')
    expect(ct!.fdiContext).toBeDefined()
    expect(ct!.fdiContext!.fdi).toBe('FDI-CT-001')
    expect(ct!.samlUrl).toBeDefined()
  }, 30_000)

  it('followSamlChain reaches eUnity viewer', async () => {
    // Get imaging result with FDI context
    const results = await getImagingResults(session)
    const xray = results.find(r => r.fdiContext)
    expect(xray?.samlUrl).toBeDefined()

    const viewerSession = await followSamlChain(session, xray!.samlUrl!)
    expect(viewerSession).not.toBeNull()
    expect(viewerSession!.viewerUrl).toContain('/e/viewer')
    // jsessionId may be empty if Set-Cookie isn't propagated via fetch
    expect(viewerSession!.jsessionId).toBeDefined()
    // Viewer body should contain study params
    expect(viewerSession!.viewerBody).toContain('accessionNumber')
  }, 30_000)

  it('downloadImagingStudyDirect downloads X-ray CLO image data', async () => {
    const results = await getImagingResults(session)
    const xray = results.find(r => r.fdiContext && r.orderName.includes('XR'))
    expect(xray?.fdiContext).toBeDefined()

    const result = await downloadImagingStudyDirect(
      session,
      xray!.fdiContext!,
      'Homer Skull XRay',
      '/tmp/fake-mychart-test-images',
      { skipFileWrite: true },
    )

    expect(result.studyName).toBe('Homer Skull XRay')
    expect(result.errors).toHaveLength(0)
    expect(result.images.length).toBeGreaterThan(0)
    const img = result.images[0]
    expect(img.format).toBe('CLHAAR')
    expect(img.pixelData).toBeDefined()
    expect(img.pixelData!.length).toBeGreaterThan(0)
  }, 60_000)

  it('downloadImagingStudyDirect downloads CT multi-slice images', async () => {
    const results = await getImagingResults(session)
    const ct = results.find(r => r.fdiContext && r.orderName.includes('CT'))
    expect(ct?.fdiContext).toBeDefined()

    const result = await downloadImagingStudyDirect(
      session,
      ct!.fdiContext!,
      'Homer CT Head',
      '/tmp/fake-mychart-test-ct',
      { skipFileWrite: true },
    )

    expect(result.studyName).toBe('Homer CT Head')
    expect(result.errors).toHaveLength(0)
    // CT should have multiple images (multi-slice)
    expect(result.images.length).toBeGreaterThan(2)
    // All should be CLHAAR format
    for (const img of result.images) {
      expect(img.format).toBe('CLHAAR')
      expect(img.pixelData).toBeDefined()
      expect(img.pixelData!.length).toBeGreaterThan(0)
    }
    // Should have multiple series
    expect(result.seriesList).toBeDefined()
    expect(result.seriesList!.length).toBeGreaterThanOrEqual(2)
  }, 60_000)
})
