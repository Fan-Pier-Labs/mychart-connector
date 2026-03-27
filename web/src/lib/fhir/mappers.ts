/**
 * Maps FHIR R4 resources to the same data shapes returned by MyChart scrapers.
 * This allows MCP tools to return consistent formats regardless of connection type.
 */

import type { FhirResource } from './client';

// ── Helper utilities ──

function getHumanName(patient: FhirResource): string {
  const names = patient.name as Array<{ use?: string; text?: string; given?: string[]; family?: string }> | undefined;
  if (!names?.length) return 'Unknown';
  const official = names.find((n) => n.use === 'official') || names[0];
  if (official.text) return official.text;
  const given = official.given?.join(' ') || '';
  const family = official.family || '';
  return `${given} ${family}`.trim();
}

function getIdentifier(resource: FhirResource, type: string): string {
  const identifiers = resource.identifier as Array<{ type?: { coding?: Array<{ code?: string }> }; value?: string }> | undefined;
  if (!identifiers) return '';
  const match = identifiers.find((id) =>
    id.type?.coding?.some((c) => c.code === type)
  );
  return match?.value || '';
}

function getCodeText(resource: FhirResource, field = 'code'): string {
  const code = resource[field] as { text?: string; coding?: Array<{ display?: string }> } | undefined;
  if (!code) return '';
  return code.text || code.coding?.[0]?.display || '';
}

function formatDate(dateStr: unknown): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ── Profile ──

export interface FhirProfileData {
  name: string;
  dob: string;
  mrn: string;
  pcp: string;
  email: string | null;
}

export function mapPatientToProfile(patient: FhirResource): FhirProfileData {
  const name = getHumanName(patient);
  const dob = formatDate(patient.birthDate);
  const mrn = getIdentifier(patient, 'MR');

  // PCP from generalPractitioner
  const practitioners = patient.generalPractitioner as Array<{ display?: string }> | undefined;
  const pcp = practitioners?.[0]?.display || '';

  // Email from telecom
  const telecoms = patient.telecom as Array<{ system?: string; value?: string }> | undefined;
  const email = telecoms?.find((t) => t.system === 'email')?.value || null;

  return { name, dob, mrn, pcp, email };
}

// ── Medications ──

export interface FhirMedication {
  name: string;
  commonName: string;
  sig: string;
  dateToDisplay: string;
  startDate: string;
  authorizingProviderName: string;
  orderingProviderName: string;
  isRefillable: boolean;
  isPatientReported: boolean;
  pharmacy: null;
  refillDetails: null;
  medicationKey: null;
}

export interface FhirMedicationsResult {
  medications: FhirMedication[];
  patientFirstName: string;
}

export function mapMedicationRequests(resources: FhirResource[], patientName: string): FhirMedicationsResult {
  const medications: FhirMedication[] = resources.map((r) => {
    const medCode = r.medicationCodeableConcept as { text?: string; coding?: Array<{ display?: string }> } | undefined;
    const name = medCode?.text || medCode?.coding?.[0]?.display || '';

    const dosageInstructions = r.dosageInstruction as Array<{ text?: string }> | undefined;
    const sig = dosageInstructions?.[0]?.text || '';

    const requester = r.requester as { display?: string } | undefined;
    const authoredOn = r.authoredOn as string | undefined;

    return {
      name,
      commonName: name,
      sig,
      dateToDisplay: formatDate(authoredOn),
      startDate: formatDate(authoredOn),
      authorizingProviderName: requester?.display || '',
      orderingProviderName: requester?.display || '',
      isRefillable: false,
      isPatientReported: (r.reportedBoolean as boolean) || false,
      pharmacy: null,
      refillDetails: null,
      medicationKey: null,
    };
  });

  const firstName = patientName.split(' ')[0] || '';
  return { medications, patientFirstName: firstName };
}

// ── Allergies ──

export interface FhirAllergy {
  name: string;
  id: string;
  formattedDateNoted: string;
  type: string;
  reaction: string;
  severity: string;
}

export interface FhirAllergiesResult {
  allergies: FhirAllergy[];
  allergiesStatus: number;
}

export function mapAllergyIntolerances(resources: FhirResource[]): FhirAllergiesResult {
  const allergies: FhirAllergy[] = resources.map((r) => {
    const name = getCodeText(r);

    const reactions = r.reaction as Array<{
      manifestation?: Array<{ text?: string; coding?: Array<{ display?: string }> }>;
      severity?: string;
    }> | undefined;

    const reaction = reactions?.[0]?.manifestation?.[0]?.text
      || reactions?.[0]?.manifestation?.[0]?.coding?.[0]?.display
      || '';

    const severity = reactions?.[0]?.severity || (r.criticality as string) || '';

    const category = r.category as string[] | undefined;
    const type = category?.[0] || '';

    return {
      name,
      id: (r.id as string) || '',
      formattedDateNoted: formatDate(r.recordedDate || r.onsetDateTime),
      type,
      reaction,
      severity,
    };
  });

  return { allergies, allergiesStatus: 0 };
}

// ── Health Issues (Conditions) ──

export interface FhirHealthIssue {
  name: string;
  id: string;
  formattedDateNoted: string;
  isReadOnly: boolean;
}

export function mapConditions(resources: FhirResource[]): FhirHealthIssue[] {
  return resources.map((r) => ({
    name: getCodeText(r),
    id: (r.id as string) || '',
    formattedDateNoted: formatDate(r.onsetDateTime || r.recordedDate),
    isReadOnly: true,
  }));
}

// ── Lab Results ──

export interface FhirLabResult {
  orderName: string;
  key: string;
  results: Array<{
    name: string;
    key: string;
    showName: boolean;
    showDetails: boolean;
    orderMetadata: {
      orderProviderName: string;
      resultTimestampDisplay: string;
      resultStatus: string;
    };
    resultComponents: Array<{
      componentInfo: {
        componentID: string;
        name: string;
        commonName: string;
        units: string;
      };
      componentResultInfo: {
        value: string;
        referenceRange: {
          formattedReferenceRange: string;
        };
        abnormalFlagCategoryValue: string | number;
      };
    }>;
    isAbnormal: boolean;
  }>;
}

export function mapObservationsToLabResults(resources: FhirResource[]): FhirLabResult[] {
  // Group observations by their associated report/order if available
  return resources.map((r) => {
    const name = getCodeText(r);
    const id = (r.id as string) || '';
    const effectiveDateTime = r.effectiveDateTime as string | undefined;

    const performer = r.performer as Array<{ display?: string }> | undefined;
    const providerName = performer?.[0]?.display || '';

    const valueQuantity = r.valueQuantity as { value?: number; unit?: string } | undefined;
    const valueString = r.valueString as string | undefined;
    const value = valueQuantity
      ? `${valueQuantity.value ?? ''} ${valueQuantity.unit ?? ''}`.trim()
      : valueString || '';

    const referenceRange = r.referenceRange as Array<{
      low?: { value?: number; unit?: string };
      high?: { value?: number; unit?: string };
      text?: string;
    }> | undefined;

    const rangeText = referenceRange?.[0]?.text
      || (referenceRange?.[0]?.low && referenceRange?.[0]?.high
        ? `${referenceRange[0].low.value} - ${referenceRange[0].high.value}`
        : '');

    const interpretation = r.interpretation as Array<{ coding?: Array<{ code?: string }> }> | undefined;
    const isAbnormal = interpretation?.some((i) =>
      i.coding?.some((c) => c.code && !['N', 'normal'].includes(c.code))
    ) || false;

    return {
      orderName: name,
      key: id,
      results: [{
        name,
        key: id,
        showName: true,
        showDetails: true,
        orderMetadata: {
          orderProviderName: providerName,
          resultTimestampDisplay: formatDate(effectiveDateTime),
          resultStatus: 'Final',
        },
        resultComponents: [{
          componentInfo: {
            componentID: id,
            name,
            commonName: name,
            units: valueQuantity?.unit || '',
          },
          componentResultInfo: {
            value,
            referenceRange: {
              formattedReferenceRange: rangeText,
            },
            abnormalFlagCategoryValue: isAbnormal ? 'A' : 'N',
          },
        }],
        isAbnormal,
      }],
    };
  });
}

// ── Vitals ──

export interface FhirFlowsheet {
  name: string;
  flowsheetId: string;
  readings: Array<{
    date: string;
    value: string;
    units: string;
  }>;
}

export function mapObservationsToVitals(resources: FhirResource[]): FhirFlowsheet[] {
  // Group vital observations by code
  const grouped = new Map<string, { name: string; readings: Array<{ date: string; value: string; units: string }> }>();

  for (const r of resources) {
    const name = getCodeText(r);
    const code = ((r.code as { coding?: Array<{ code?: string }> })?.coding?.[0]?.code) || name;

    const valueQuantity = r.valueQuantity as { value?: number; unit?: string } | undefined;
    const effectiveDateTime = r.effectiveDateTime as string | undefined;

    if (!valueQuantity?.value) continue;

    const existing = grouped.get(code);
    const reading = {
      date: formatDate(effectiveDateTime),
      value: String(valueQuantity.value),
      units: valueQuantity.unit || '',
    };

    if (existing) {
      existing.readings.push(reading);
    } else {
      grouped.set(code, { name, readings: [reading] });
    }
  }

  return Array.from(grouped.entries()).map(([code, data]) => ({
    name: data.name,
    flowsheetId: code,
    readings: data.readings,
  }));
}

// ── Immunizations ──

export interface FhirImmunization {
  name: string;
  id: string;
  administeredDates: string[];
  organizationName: string;
}

export function mapImmunizations(resources: FhirResource[]): FhirImmunization[] {
  // Group immunizations by vaccine code
  const grouped = new Map<string, FhirImmunization>();

  for (const r of resources) {
    const name = getCodeText(r, 'vaccineCode');
    const id = (r.id as string) || '';
    const occurrenceDateTime = r.occurrenceDateTime as string | undefined;
    const performer = r.performer as Array<{ actor?: { display?: string } }> | undefined;
    const orgName = performer?.[0]?.actor?.display || '';

    const existing = grouped.get(name);
    if (existing) {
      if (occurrenceDateTime) {
        existing.administeredDates.push(formatDate(occurrenceDateTime));
      }
    } else {
      grouped.set(name, {
        name,
        id,
        administeredDates: occurrenceDateTime ? [formatDate(occurrenceDateTime)] : [],
        organizationName: orgName,
      });
    }
  }

  return Array.from(grouped.values());
}

// ── Visits (Encounters) ──

export interface FhirVisit {
  date: string;
  time: string;
  visitTypeName: string;
  providerName: string;
  departmentName: string;
  status: string;
}

export function mapEncountersToVisits(resources: FhirResource[]): FhirVisit[] {
  return resources.map((r) => {
    const period = r.period as { start?: string; end?: string } | undefined;
    const startDate = period?.start ? new Date(period.start) : null;

    const types = r.type as Array<{ text?: string; coding?: Array<{ display?: string }> }> | undefined;
    const visitType = types?.[0]?.text || types?.[0]?.coding?.[0]?.display || '';

    const participants = r.participant as Array<{
      individual?: { display?: string };
      type?: Array<{ coding?: Array<{ code?: string }> }>;
    }> | undefined;

    const provider = participants?.find((p) =>
      p.type?.some((t) => t.coding?.some((c) => c.code === 'ATND' || c.code === 'PPRF'))
    );
    const providerName = provider?.individual?.display || participants?.[0]?.individual?.display || '';

    const location = r.location as Array<{ location?: { display?: string } }> | undefined;
    const departmentName = location?.[0]?.location?.display || '';

    return {
      date: startDate ? startDate.toLocaleDateString('en-US') : '',
      time: startDate ? startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
      visitTypeName: visitType,
      providerName,
      departmentName,
      status: (r.status as string) || '',
    };
  });
}

// ── Care Team ──

export interface FhirCareTeamMember {
  name: string;
  role: string;
  specialty: string;
}

export function mapCareTeams(resources: FhirResource[]): FhirCareTeamMember[] {
  const members: FhirCareTeamMember[] = [];

  for (const r of resources) {
    const participants = r.participant as Array<{
      member?: { display?: string };
      role?: Array<{ text?: string; coding?: Array<{ display?: string }> }>;
    }> | undefined;

    if (!participants) continue;

    for (const p of participants) {
      members.push({
        name: p.member?.display || '',
        role: p.role?.[0]?.text || p.role?.[0]?.coding?.[0]?.display || '',
        specialty: '',
      });
    }
  }

  return members;
}

// ── Documents ──

export interface FhirDocument {
  id: string;
  title: string;
  documentType: string;
  date: string;
  providerName: string;
  organizationName: string;
}

export function mapDocumentReferences(resources: FhirResource[]): FhirDocument[] {
  return resources.map((r) => {
    const type = r.type as { text?: string; coding?: Array<{ display?: string }> } | undefined;

    const author = r.author as Array<{ display?: string }> | undefined;
    const context = r.context as { encounter?: Array<{ display?: string }>; facilityType?: { text?: string } } | undefined;

    return {
      id: (r.id as string) || '',
      title: (r.description as string) || type?.text || type?.coding?.[0]?.display || '',
      documentType: type?.text || type?.coding?.[0]?.display || '',
      date: formatDate(r.date),
      providerName: author?.[0]?.display || '',
      organizationName: context?.facilityType?.text || '',
    };
  });
}

// ── Imaging Results (DiagnosticReport) ──

export interface FhirImagingResult {
  orderName: string;
  key: string;
  reportText: string;
  date: string;
  providerName: string;
  status: string;
}

export function mapDiagnosticReportsToImaging(resources: FhirResource[]): FhirImagingResult[] {
  return resources.map((r) => {
    const name = getCodeText(r);
    const performer = r.performer as Array<{ display?: string }> | undefined;

    return {
      orderName: name,
      key: (r.id as string) || '',
      reportText: (r.conclusion as string) || '',
      date: formatDate(r.effectiveDateTime || r.issued),
      providerName: performer?.[0]?.display || '',
      status: (r.status as string) || '',
    };
  });
}
