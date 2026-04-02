export type MedicationType = {
  name: string;
  commonName?: string;
  sig: string;
  authorizingProviderName: string;
  orderingProviderName?: string;
  isRefillable: boolean;
  isPatientReported: boolean;
  pharmacy: { name: string } | null;
  startDate?: string;
  dateToDisplay?: string;
};

export type AllergyType = {
  name: string;
  type: string;
  reaction: string;
  severity: string;
};

export type ImmunizationType = {
  name: string;
  administeredDates: string[];
  organizationName: string;
};

export type InsuranceCoverageType = {
  planName: string;
  subscriberName: string;
  memberId: string;
  groupNumber: string;
  details: string[];
};

export type CareTeamMemberType = {
  name: string;
  role: string;
  specialty: string;
};

export type ReferralType = {
  status: string;
  statusString: string;
  referredByProviderName: string;
  referredToProviderName: string;
  referredToFacility: string;
  creationDate?: string;
  startDate: string;
  endDate: string;
};

export type HealthIssueType = {
  name: string;
  formattedDateNoted: string;
};

export type FlowsheetType = {
  name: string;
  readings: VitalReadingType[];
};

export type VitalReadingType = {
  date: string;
  value: string;
  units: string;
};

export type EmergencyContactType = {
  name: string;
  relationshipType: string;
  phoneNumber: string;
  isEmergencyContact: boolean;
};

export type DiagnosisType = {
  diagnosisName: string;
  diagnosisDate: string;
};

export type SurgeryType = {
  surgeryName: string;
  surgeryDate: string;
};

export type FamilyMemberType = {
  relationshipToPatientName: string;
  statusName: string;
  conditions: string[];
};

export type PreventiveCareType = {
  name: string;
  status: string;
  overdueSince: string;
  notDueUntil: string;
  previouslyDone: string[];
  completedDate: string;
};

export type GoalType = {
  name: string;
  description: string;
  status: string;
  targetDate: string;
};

export type LetterType = {
  dateISO: string;
  reason: string;
  viewed: boolean;
  providerName: string;
  hnoId: string;
  csn: string;
};

export type DocumentType = {
  title: string;
  documentType: string;
  date: string;
  providerName: string;
  organizationName: string;
};

export type ActivityFeedItemType = {
  title: string;
  description: string;
  date: string;
  type: string;
  isRead: boolean;
};

export type ImagingSeriesInfo = {
  studyDescription: string;
  modality: string;
  numberOfImages: number;
};

export type ImagingResultType = {
  orderName: string;
  narrative: string;
  impression: string;
  imageStudyCount: number;
  scanCount: number;
  resultDate: string;
  orderProvider: string;
  fdiContext?: { fdi: string; ord: string } | null;
  series?: ImagingSeriesInfo[];
};

export type UpcomingOrderType = {
  orderName: string;
  orderType: string;
  status: string;
  orderedDate: string;
  orderedByProvider: string;
  facilityName: string;
};

export type QuestionnaireType = {
  name: string;
  status: string;
  dueDate: string;
  completedDate: string;
};

export type CareJourneyType = {
  name: string;
  description: string;
  status: string;
  providerName: string;
};

export type EducationMaterialType = {
  title: string;
  category: string;
  assignedDate: string;
  providerName: string;
};

export type EhiTemplateType = {
  name: string;
  description: string;
  format: string;
};

export type LinkedMyChartAccountType = {
  name: string;
  logoUrl: string;
  lastEncounter: string | null;
};

export type ConversationMessageType = {
  messageId: string;
  senderName: string;
  sentDate: string;
  messageBody: string;
  isFromPatient: boolean;
};

export type ConversationType = {
  conversationId: string;
  subject: string;
  senderName: string;
  lastMessageDate: string;
  preview: string;
  messages?: ConversationMessageType[];
};

import type { BillingAccount } from "../lib/mychart/bills/bills";
import type { LabTestResultWithHistory } from "../../../scrapers/myChart/labs_and_procedure_results/labtestresulttype";

/** Shape of the full scrape-results object stored in AppContext */
export interface ScrapeResults {
  profile?: { name: string; dob: string; mrn: string; pcp: string; error?: string };
  email?: string;
  healthSummary?: {
    patientAge: string;
    bloodType: string;
    height?: { value: string; dateRecorded: string };
    weight?: { value: string; dateRecorded: string };
    lastVisit?: { date: string; visitType: string };
  };
  medications?: { medications: MedicationType[] };
  allergies?: { allergies: AllergyType[] };
  immunizations?: ImmunizationType[];
  insurance?: { coverages: InsuranceCoverageType[] };
  careTeam?: CareTeamMemberType[];
  referrals?: ReferralType[];
  healthIssues?: HealthIssueType[];
  vitals?: FlowsheetType[];
  emergencyContacts?: EmergencyContactType[];
  medicalHistory?: {
    medicalHistory?: { diagnoses: DiagnosisType[] };
    surgicalHistory?: { surgeries: SurgeryType[] };
    familyHistory?: { familyMembers: FamilyMemberType[] };
  };
  preventiveCare?: PreventiveCareType[];
  goals?: { careTeamGoals?: GoalType[]; patientGoals?: GoalType[] };
  letters?: LetterType[];
  documents?: DocumentType[];
  activityFeed?: ActivityFeedItemType[];
  billing?: BillingAccount[] | { error: string };
  upcomingVisits?: { error?: string; LaterVisitsList?: UpcomingVisit[]; NextNDaysVisits?: UpcomingVisit[]; InProgressVisits?: UpcomingVisit[] };
  pastVisits?: { List: Record<string, PastVisitOrganization>; error?: string };
  labResults?: LabTestResultWithHistory[] | { error: string };
  imagingResults?: ImagingResultType[];
  upcomingOrders?: UpcomingOrderType[];
  questionnaires?: QuestionnaireType[];
  careJourneys?: CareJourneyType[];
  educationMaterials?: EducationMaterialType[];
  ehiExport?: EhiTemplateType[];
  linkedMyChartAccounts?: LinkedMyChartAccountType[];
  messages?: { conversations: ConversationType[]; error?: string };
}

/** A visit entry in the upcoming/past visits list */
export type UpcomingVisit = {
  Date: string;
  Time?: string;
  VisitTypeName: string;
  PrimaryProviderName?: string;
  PrimaryDepartment?: { Name: string };
  /** Physical location (e.g. "Springfield General Hospital, Suite 200") — separate from department/specialty */
  Location?: string;
};

/** Organization entry in pastVisits.List */
export type PastVisitOrganization = {
  List: UpcomingVisit[];
};
