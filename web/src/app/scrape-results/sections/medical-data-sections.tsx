"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataRow, DataSection, ArraySection, VisitsCard, VisitItem, LabItem, safeText } from "@/components/data-display";
import { ErrorBoundary, withRenderErrorBoundary } from "@/components/with-render-error-boundary";
import type {
  ScrapeResults,
  MedicationType,
  AllergyType,
  ImmunizationType,
  InsuranceCoverageType,
  CareTeamMemberType,
  ReferralType,
  HealthIssueType,
  FlowsheetType,
  VitalReadingType,
  EmergencyContactType,
  DiagnosisType,
  SurgeryType,
  FamilyMemberType,
  PreventiveCareType,
  GoalType,
  DocumentType,
  ActivityFeedItemType,
  UpcomingOrderType,
  QuestionnaireType,
  CareJourneyType,
  EducationMaterialType,
  EhiTemplateType,
  LinkedMyChartAccountType,
  PastVisitOrganization,
} from "@/types/scrape-results";
import type { LabTestResultWithHistory } from "../../../../../scrapers/myChart/labs_and_procedure_results/labtestresulttype";

const SafeDataSection = withRenderErrorBoundary(DataSection, "DataSection", (p) => p.data);
const SafeArraySection = withRenderErrorBoundary(ArraySection, "ArraySection", (p) => p.data);
const SafeVisitsCard = withRenderErrorBoundary(VisitsCard, "VisitsCard", (p) => p.data);
const SafeVisitItem = withRenderErrorBoundary(VisitItem, "VisitItem", (p) => p.visit);
const SafeLabItem = withRenderErrorBoundary(LabItem, "LabItem", (p) => p.lab);

export function ProfileSection({ results }: { results: ScrapeResults }) {
  if (!results.profile || results.profile.error) return null;
  return (
    <ErrorBoundary name="Profile" data={results.profile}>
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <DataRow label="Name" value={results.profile.name} />
          <DataRow label="Date of Birth" value={results.profile.dob} />
          <DataRow label="MRN" value={results.profile.mrn} />
          <DataRow label="PCP" value={results.profile.pcp} />
          {results.email && <DataRow label="Email" value={results.email} />}
        </div>
      </CardContent>
    </Card>
    </ErrorBoundary>
  );
}

export function HealthSummarySection({ healthSummary }: { healthSummary: ScrapeResults['healthSummary'] }) {
  return (
    <SafeDataSection title="Health Summary" data={healthSummary}>
      {healthSummary && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <DataRow label="Age" value={healthSummary.patientAge} />
          <DataRow label="Blood Type" value={healthSummary.bloodType} />
          {healthSummary.height && (
            <DataRow label="Height" value={`${healthSummary.height.value} (${healthSummary.height.dateRecorded})`} />
          )}
          {healthSummary.weight && (
            <DataRow label="Weight" value={`${healthSummary.weight.value} (${healthSummary.weight.dateRecorded})`} />
          )}
          {healthSummary.lastVisit && (
            <DataRow label="Last Visit" value={`${healthSummary.lastVisit.date} - ${healthSummary.lastVisit.visitType}`} />
          )}
        </div>
      )}
    </SafeDataSection>
  );
}

export function MedicationsSection({ medications }: { medications: ScrapeResults['medications'] }) {
  return (
    <SafeDataSection title="Medications" data={medications} count={medications?.medications?.length}>
      {medications?.medications?.map((med: MedicationType, i: number) => (
        <div key={i} className="bg-muted rounded-md p-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">{med.name}</span>
            {med.isRefillable && <Badge variant="outline" className="text-[10px]">Refillable</Badge>}
            {med.isPatientReported && <Badge variant="secondary" className="text-[10px]">Self-reported</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{med.sig}</p>
          <div className="flex gap-4 text-xs text-muted-foreground mt-1">
            {med.authorizingProviderName && <span>Prescriber: {med.authorizingProviderName}</span>}
            {med.pharmacy?.name && <span>Pharmacy: {med.pharmacy.name}</span>}
          </div>
        </div>
      ))}
    </SafeDataSection>
  );
}

export function AllergiesSection({ allergies }: { allergies: ScrapeResults['allergies'] }) {
  return (
    <SafeDataSection title="Allergies" data={allergies} count={allergies?.allergies?.length}>
      {allergies?.allergies?.map((a: AllergyType, i: number) => (
        <div key={i} className="flex items-center justify-between bg-muted rounded-md p-3 text-sm">
          <div>
            <span className="font-medium">{a.name}</span>
            <span className="text-xs text-muted-foreground ml-2">({a.type})</span>
            {a.reaction && <p className="text-xs text-muted-foreground">Reaction: {a.reaction}</p>}
          </div>
          {a.severity && (
            <Badge variant={a.severity === 'Severe' ? 'destructive' : 'outline'} className="text-[10px]">
              {a.severity}
            </Badge>
          )}
        </div>
      ))}
    </SafeDataSection>
  );
}

export function ImmunizationsSection({ immunizations }: { immunizations: ImmunizationType[] | undefined }) {
  return (
    <SafeArraySection title="Immunizations" data={immunizations}>
      {Array.isArray(immunizations) && immunizations.map((imm: ImmunizationType, i: number) => (
        <div key={i} className="bg-muted rounded-md p-3 text-sm">
          <span className="font-medium">{imm.name}</span>
          <p className="text-xs text-muted-foreground mt-1">
            Dates: {imm.administeredDates.join(', ')}
          </p>
          {imm.organizationName && (
            <p className="text-xs text-muted-foreground">Facility: {imm.organizationName}</p>
          )}
        </div>
      ))}
    </SafeArraySection>
  );
}

export function InsuranceSection({ insurance }: { insurance: ScrapeResults['insurance'] }) {
  return (
    <SafeDataSection title="Insurance" data={insurance} count={insurance?.coverages?.length}>
      {insurance?.coverages?.map((cov: InsuranceCoverageType, i: number) => (
        <div key={i} className="bg-muted rounded-md p-3 text-sm">
          <span className="font-medium">{cov.planName}</span>
          <div className="grid grid-cols-2 gap-1 mt-1 text-xs text-muted-foreground">
            {cov.subscriberName && <span>Subscriber: {cov.subscriberName}</span>}
            {cov.memberId && <span>Member ID: {cov.memberId}</span>}
            {cov.groupNumber && <span>Group: {cov.groupNumber}</span>}
          </div>
          {cov.details?.map((d: string, j: number) => (
            <p key={j} className="text-xs text-muted-foreground">{safeText(d)}</p>
          ))}
        </div>
      ))}
    </SafeDataSection>
  );
}

export function CareTeamSection({ careTeam }: { careTeam: CareTeamMemberType[] | undefined }) {
  return (
    <SafeArraySection title="Care Team" data={careTeam}>
      {Array.isArray(careTeam) && careTeam.map((m: CareTeamMemberType, i: number) => (
        <div key={i} className="bg-muted rounded-md p-3 text-sm">
          <span className="font-medium">{m.name}</span>
          {m.role && <Badge variant="outline" className="text-[10px] ml-2">{safeText(m.role)}</Badge>}
          {m.specialty && <p className="text-xs text-muted-foreground mt-1">{safeText(m.specialty)}</p>}
        </div>
      ))}
    </SafeArraySection>
  );
}

export function ReferralsSection({ referrals }: { referrals: ReferralType[] | undefined }) {
  return (
    <SafeArraySection title="Referrals" data={referrals}>
      {Array.isArray(referrals) && referrals.map((ref: ReferralType, i: number) => (
        <div key={i} className="bg-muted rounded-md p-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">{ref.referredByProviderName} → {ref.referredToProviderName}</span>
            <Badge variant={ref.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
              {safeText(ref.statusString)}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {ref.referredToFacility && <span>Facility: {ref.referredToFacility}</span>}
            {ref.startDate && <span className="ml-3">{ref.startDate} - {ref.endDate}</span>}
          </div>
        </div>
      ))}
    </SafeArraySection>
  );
}

export function HealthIssuesSection({ healthIssues }: { healthIssues: HealthIssueType[] | undefined }) {
  return (
    <SafeArraySection title="Health Issues" data={healthIssues}>
      {Array.isArray(healthIssues) && healthIssues.map((hi: HealthIssueType, i: number) => (
        <div key={i} className="flex items-center justify-between bg-muted rounded-md p-3 text-sm">
          <div>
            <span className="font-medium">{hi.name}</span>
            {hi.formattedDateNoted && <span className="text-xs text-muted-foreground ml-2">Noted: {hi.formattedDateNoted}</span>}
          </div>
        </div>
      ))}
    </SafeArraySection>
  );
}

export function VitalsSection({ vitals }: { vitals: FlowsheetType[] | undefined }) {
  return (
    <SafeArraySection title="Vitals" data={vitals}>
      {Array.isArray(vitals) && vitals.map((flowsheet: FlowsheetType, i: number) => (
        <div key={i} className="bg-muted rounded-md p-3 text-sm">
          <span className="font-semibold">{flowsheet.name}</span>
          <div className="mt-2 space-y-1">
            {flowsheet.readings?.slice(0, 5).map((r: VitalReadingType, j: number) => (
              <div key={j} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{r.date}</span>
                <span className="font-medium">{r.value} {r.units}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </SafeArraySection>
  );
}

export function EmergencyContactsSection({ emergencyContacts }: { emergencyContacts: EmergencyContactType[] | undefined }) {
  return (
    <SafeArraySection title="Emergency Contacts" data={emergencyContacts}>
      {Array.isArray(emergencyContacts) && emergencyContacts.map((ec: EmergencyContactType, i: number) => (
        <div key={i} className="bg-muted rounded-md p-3 text-sm">
          <span className="font-medium">{ec.name}</span>
          <span className="text-xs text-muted-foreground ml-2">({ec.relationshipType})</span>
          {ec.phoneNumber && <p className="text-xs text-muted-foreground mt-1">{ec.phoneNumber}</p>}
          {ec.isEmergencyContact && <Badge variant="outline" className="text-[10px] mt-1">Emergency Contact</Badge>}
        </div>
      ))}
    </SafeArraySection>
  );
}

export function MedicalHistorySection({ medicalHistory }: { medicalHistory: ScrapeResults['medicalHistory'] }) {
  return (
    <SafeDataSection title="Medical History" data={medicalHistory}>
      {medicalHistory && (
        <div className="space-y-4">
          {(medicalHistory.medicalHistory?.diagnoses?.length ?? 0) > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Diagnoses</h4>
              {medicalHistory.medicalHistory!.diagnoses.map((d: DiagnosisType, i: number) => (
                <div key={i} className="text-xs text-muted-foreground">
                  {d.diagnosisName} {d.diagnosisDate && `(${d.diagnosisDate})`}
                </div>
              ))}
            </div>
          )}
          {(medicalHistory.surgicalHistory?.surgeries?.length ?? 0) > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Surgical History</h4>
              {medicalHistory.surgicalHistory!.surgeries.map((s: SurgeryType, i: number) => (
                <div key={i} className="text-xs text-muted-foreground">
                  {s.surgeryName} {s.surgeryDate && `(${s.surgeryDate})`}
                </div>
              ))}
            </div>
          )}
          {(medicalHistory.familyHistory?.familyMembers?.length ?? 0) > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Family History</h4>
              {medicalHistory.familyHistory!.familyMembers.map((m: FamilyMemberType, i: number) => (
                <div key={i} className="bg-muted rounded-md p-2 text-xs">
                  <span className="font-medium">{m.relationshipToPatientName}</span>
                  <span className="text-muted-foreground ml-2">({m.statusName})</span>
                  {m.conditions?.length > 0 && (
                    <p className="text-muted-foreground mt-1">{m.conditions.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </SafeDataSection>
  );
}

export function PreventiveCareSection({ preventiveCare }: { preventiveCare: PreventiveCareType[] | undefined }) {
  return (
    <SafeArraySection title="Preventive Care" data={preventiveCare}>
      {Array.isArray(preventiveCare) && preventiveCare.map((item: PreventiveCareType, i: number) => (
        <div key={i} className="flex items-center justify-between bg-muted rounded-md p-3 text-sm">
          <div>
            <span className="font-medium">{item.name}</span>
            {item.overdueSince && <p className="text-xs text-red-500">Overdue since {item.overdueSince}</p>}
            {item.notDueUntil && <p className="text-xs text-muted-foreground">Not due until {item.notDueUntil}</p>}
            {item.completedDate && <p className="text-xs text-muted-foreground">Completed: {item.completedDate}</p>}
            {item.previouslyDone?.length > 0 && (
              <p className="text-xs text-muted-foreground">Previously: {item.previouslyDone.join(', ')}</p>
            )}
          </div>
          <Badge
            variant={item.status === 'overdue' ? 'destructive' : item.status === 'completed' ? 'default' : 'secondary'}
            className="text-[10px]"
          >
            {item.status === 'not_due' ? 'Not Due' : item.status === 'overdue' ? 'Overdue' : item.status === 'completed' ? 'Completed' : item.status}
          </Badge>
        </div>
      ))}
    </SafeArraySection>
  );
}

export function GoalsSection({ goals }: { goals: ScrapeResults['goals'] }) {
  return (
    <SafeDataSection title="Goals" data={goals}>
      {goals && (
        <div className="space-y-3">
          {goals.careTeamGoals?.map((g: GoalType, i: number) => (
            <div key={`ct-${i}`} className="bg-muted rounded-md p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{g.name}</span>
                <Badge variant="outline" className="text-[10px]">Care Team</Badge>
                {g.status && <Badge variant="secondary" className="text-[10px]">{g.status}</Badge>}
              </div>
              {g.description && <p className="text-xs text-muted-foreground mt-1">{g.description}</p>}
              {g.targetDate && <p className="text-xs text-muted-foreground">Target: {g.targetDate}</p>}
            </div>
          ))}
          {goals.patientGoals?.map((g: GoalType, i: number) => (
            <div key={`pt-${i}`} className="bg-muted rounded-md p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{g.name}</span>
                <Badge variant="outline" className="text-[10px]">Patient</Badge>
                {g.status && <Badge variant="secondary" className="text-[10px]">{g.status}</Badge>}
              </div>
              {g.description && <p className="text-xs text-muted-foreground mt-1">{g.description}</p>}
              {g.targetDate && <p className="text-xs text-muted-foreground">Target: {g.targetDate}</p>}
            </div>
          ))}
        </div>
      )}
    </SafeDataSection>
  );
}

export function DocumentsSection({ documents }: { documents: DocumentType[] | undefined }) {
  return (
    <SafeArraySection title="Documents" data={documents}>
      {Array.isArray(documents) && documents.map((doc: DocumentType, i: number) => (
        <div key={i} className="bg-muted rounded-md p-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">{doc.title}</span>
            <Badge variant="outline" className="text-[10px]">{doc.documentType}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {doc.providerName} - {doc.date}
            {doc.organizationName && ` | ${doc.organizationName}`}
          </p>
        </div>
      ))}
    </SafeArraySection>
  );
}

export function ActivityFeedSection({ activityFeed }: { activityFeed: ActivityFeedItemType[] | undefined }) {
  return (
    <SafeArraySection title="Activity Feed" data={activityFeed}>
      {Array.isArray(activityFeed) && activityFeed.map((item: ActivityFeedItemType, i: number) => (
        <div key={i} className="flex items-center justify-between bg-muted rounded-md p-3 text-sm">
          <div>
            <span className="font-medium">{safeText(item.title)}</span>
            <p className="text-xs text-muted-foreground">{safeText(item.description)}</p>
            <p className="text-xs text-muted-foreground">{safeText(item.date)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{safeText(item.type)}</Badge>
            {!item.isRead && <Badge variant="default" className="text-[10px]">New</Badge>}
          </div>
        </div>
      ))}
    </SafeArraySection>
  );
}

export function UpcomingVisitsSection({ upcomingVisits }: { upcomingVisits: ScrapeResults['upcomingVisits'] }) {
  return (
    <SafeVisitsCard
      title="Upcoming Visits"
      data={upcomingVisits}
      getVisits={(d) => {
        const visits = d as NonNullable<typeof upcomingVisits>;
        return [
          ...(visits?.LaterVisitsList || []),
          ...(visits?.NextNDaysVisits || []),
          ...(visits?.InProgressVisits || []),
        ];
      }}
    />
  );
}

export function PastVisitsSection({ pastVisits }: { pastVisits: ScrapeResults['pastVisits'] }) {
  if (!pastVisits || pastVisits?.error || !pastVisits?.List) return null;
  return (
    <ErrorBoundary name="PastVisits" data={pastVisits}>
    <Card>
      <CardHeader>
        <CardTitle>Past Visits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.values(pastVisits.List)
          .flatMap((org: unknown) => Array.isArray((org as PastVisitOrganization).List) ? (org as PastVisitOrganization).List : [])
          .slice(0, 20)
          .map((v, i: number) => (
            <SafeVisitItem key={i} visit={v} />
          ))}
      </CardContent>
    </Card>
    </ErrorBoundary>
  );
}

export function LabResultsSection({ labResults }: { labResults: LabTestResultWithHistory[] | undefined }) {
  if (!labResults || !Array.isArray(labResults) || labResults.length === 0) return null;
  return (
    <ErrorBoundary name="LabResults" data={labResults}>
    <Card>
      <CardHeader>
        <CardTitle>Lab Results ({labResults.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {labResults.slice(0, 15).map((lab: LabTestResultWithHistory, i: number) => (
          <SafeLabItem key={i} lab={lab} />
        ))}
      </CardContent>
    </Card>
    </ErrorBoundary>
  );
}

export function UpcomingOrdersSection({ upcomingOrders }: { upcomingOrders: UpcomingOrderType[] | undefined }) {
  return (
    <SafeArraySection title="Upcoming Orders" data={upcomingOrders}>
      {Array.isArray(upcomingOrders) && upcomingOrders.map((order: UpcomingOrderType, i: number) => (
        <div key={i} className="bg-muted rounded-md p-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">{order.orderName}</span>
            <Badge variant="outline" className="text-[10px]">{order.orderType}</Badge>
            <Badge variant="secondary" className="text-[10px]">{order.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {order.orderedByProvider} - {order.orderedDate}
            {order.facilityName && ` | ${order.facilityName}`}
          </p>
        </div>
      ))}
    </SafeArraySection>
  );
}

export function QuestionnairesSection({ questionnaires }: { questionnaires: QuestionnaireType[] | undefined }) {
  return (
    <SafeArraySection title="Questionnaires" data={questionnaires}>
      {Array.isArray(questionnaires) && questionnaires.map((q: QuestionnaireType, i: number) => (
        <div key={i} className="flex items-center justify-between bg-muted rounded-md p-3 text-sm">
          <div>
            <span className="font-medium">{q.name}</span>
            {q.dueDate && <p className="text-xs text-muted-foreground">Due: {q.dueDate}</p>}
            {q.completedDate && <p className="text-xs text-muted-foreground">Completed: {q.completedDate}</p>}
          </div>
          <Badge variant={q.status === 'Pending' ? 'default' : 'secondary'} className="text-[10px]">
            {q.status}
          </Badge>
        </div>
      ))}
    </SafeArraySection>
  );
}

export function CareJourneysSection({ careJourneys }: { careJourneys: CareJourneyType[] | undefined }) {
  return (
    <SafeArraySection title="Care Journeys" data={careJourneys}>
      {Array.isArray(careJourneys) && careJourneys.map((cj: CareJourneyType, i: number) => (
        <div key={i} className="bg-muted rounded-md p-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">{cj.name}</span>
            <Badge variant="outline" className="text-[10px]">{cj.status}</Badge>
          </div>
          {cj.description && <p className="text-xs text-muted-foreground mt-1">{cj.description}</p>}
          {cj.providerName && <p className="text-xs text-muted-foreground">Provider: {cj.providerName}</p>}
        </div>
      ))}
    </SafeArraySection>
  );
}

export function EducationMaterialsSection({ educationMaterials }: { educationMaterials: EducationMaterialType[] | undefined }) {
  return (
    <SafeArraySection title="Education Materials" data={educationMaterials}>
      {Array.isArray(educationMaterials) && educationMaterials.map((ed: EducationMaterialType, i: number) => (
        <div key={i} className="bg-muted rounded-md p-3 text-sm">
          <span className="font-medium">{ed.title}</span>
          <div className="text-xs text-muted-foreground mt-1">
            {ed.category && <span>{ed.category}</span>}
            {ed.providerName && <span className="ml-3">Assigned by: {ed.providerName}</span>}
            {ed.assignedDate && <span className="ml-3">{ed.assignedDate}</span>}
          </div>
        </div>
      ))}
    </SafeArraySection>
  );
}

export function EhiExportSection({ ehiExport }: { ehiExport: EhiTemplateType[] | undefined }) {
  return (
    <SafeArraySection title="Health Information Export" data={ehiExport}>
      {Array.isArray(ehiExport) && ehiExport.map((t: EhiTemplateType, i: number) => (
        <div key={i} className="bg-muted rounded-md p-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">{t.name}</span>
            <Badge variant="outline" className="text-[10px]">{t.format}</Badge>
          </div>
          {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
        </div>
      ))}
    </SafeArraySection>
  );
}

export function LinkedAccountsSection({ linkedMyChartAccounts }: { linkedMyChartAccounts: LinkedMyChartAccountType[] | undefined }) {
  return (
    <SafeArraySection title="Linked MyChart Accounts" data={linkedMyChartAccounts}>
      {Array.isArray(linkedMyChartAccounts) && linkedMyChartAccounts.map((acct: LinkedMyChartAccountType, i: number) => (
        <div key={i} className="flex items-center gap-3 bg-muted rounded-md p-3 text-sm">
          {acct.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={acct.logoUrl} alt={acct.name} className="h-8 w-8 object-contain" />
          )}
          <div>
            <span className="font-medium">{acct.name}</span>
            {acct.lastEncounter && (
              <p className="text-xs text-muted-foreground">Last encounter: {acct.lastEncounter}</p>
            )}
          </div>
        </div>
      ))}
    </SafeArraySection>
  );
}
