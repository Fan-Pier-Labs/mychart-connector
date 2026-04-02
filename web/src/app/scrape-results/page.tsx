"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppContext } from "@/lib/app-context";
import { CorrelatedTimeline } from "@/components/correlated-timeline";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { withRenderErrorBoundary } from "@/components/with-render-error-boundary";
import { MessagingSection } from "./sections/messaging/messaging-section";
import { BillingSection } from "./sections/billing/billing-section";
import { ImagingSection } from "./sections/imaging/imaging-section";
import { LettersSection } from "./sections/letters/letters-section";
import {
  ProfileSection,
  HealthSummarySection,
  MedicationsSection,
  AllergiesSection,
  ImmunizationsSection,
  InsuranceSection,
  CareTeamSection,
  ReferralsSection,
  HealthIssuesSection,
  VitalsSection,
  EmergencyContactsSection,
  MedicalHistorySection,
  PreventiveCareSection,
  GoalsSection,
  DocumentsSection,
  ActivityFeedSection,
  UpcomingVisitsSection,
  PastVisitsSection,
  LabResultsSection,
  UpcomingOrdersSection,
  QuestionnairesSection,
  CareJourneysSection,
  EducationMaterialsSection,
  EhiExportSection,
  LinkedAccountsSection,
} from "./sections/medical-data-sections";

const SafeCorrelatedTimeline = withRenderErrorBoundary(CorrelatedTimeline, "CorrelatedTimeline", (p) => p.data);

export default function ScrapeResultsPage() {
  const router = useRouter();
  const { results, isDemo, resetAll, token } = useAppContext();
  const [showRawJson, setShowRawJson] = useState(false);

  useEffect(() => {
    if (!results) {
      router.push("/login");
    }
  }, [results, router]);

  if (!results) return null;

  function handleBack() {
    if (isDemo) {
      resetAll();
      router.push("/login");
    } else {
      router.push("/home");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button variant="outline" onClick={handleBack}>
            ← Back
          </Button>
          <h1 className="text-3xl font-bold">MyChart MCP</h1>
          <div className="w-[68px]" /> {/* Spacer to center the title */}
        </div>
    <SectionErrorBoundary section="Scrape Results">
    <div className="space-y-6">
      {isDemo && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm text-center">
          Viewing demo data for a sample patient. This is not real patient data.
        </div>
      )}

      {/* Correlated Timeline */}
      <SafeCorrelatedTimeline data={results} />

      {/* Profile */}
      <ProfileSection results={results} />

      {/* Health Summary */}
      <HealthSummarySection healthSummary={results.healthSummary} />

      {/* Medications */}
      <MedicationsSection medications={results.medications} />

      {/* Allergies */}
      <AllergiesSection allergies={results.allergies} />

      {/* Immunizations */}
      <ImmunizationsSection immunizations={results.immunizations} />

      {/* Insurance */}
      <InsuranceSection insurance={results.insurance} />

      {/* Care Team */}
      <CareTeamSection careTeam={results.careTeam} />

      {/* Referrals */}
      <ReferralsSection referrals={results.referrals} />

      {/* Health Issues */}
      <HealthIssuesSection healthIssues={results.healthIssues} />

      {/* Vitals */}
      <VitalsSection vitals={results.vitals} />

      {/* Emergency Contacts */}
      <EmergencyContactsSection emergencyContacts={results.emergencyContacts} />

      {/* Medical History */}
      <MedicalHistorySection medicalHistory={results.medicalHistory} />

      {/* Preventive Care */}
      <PreventiveCareSection preventiveCare={results.preventiveCare} />

      {/* Goals */}
      <GoalsSection goals={results.goals} />

      {/* Letters */}
      <LettersSection letters={results.letters} isDemo={isDemo} token={token} />

      {/* Documents */}
      <DocumentsSection documents={results.documents} />

      {/* Activity Feed */}
      <ActivityFeedSection activityFeed={results.activityFeed} />

      {/* Billing */}
      <BillingSection billing={results.billing} isDemo={isDemo} token={token} />

      {/* Upcoming Visits */}
      <UpcomingVisitsSection upcomingVisits={results.upcomingVisits} />

      {/* Past Visits */}
      <PastVisitsSection pastVisits={results.pastVisits} />

      {/* Lab Results */}
      <LabResultsSection labResults={results.labResults} />

      {/* Imaging Results */}
      <ImagingSection imagingResults={results.imagingResults} isDemo={isDemo} token={token} />

      {/* Upcoming Orders */}
      <UpcomingOrdersSection upcomingOrders={results.upcomingOrders} />

      {/* Questionnaires */}
      <QuestionnairesSection questionnaires={results.questionnaires} />

      {/* Care Journeys */}
      <CareJourneysSection careJourneys={results.careJourneys} />

      {/* Education Materials */}
      <EducationMaterialsSection educationMaterials={results.educationMaterials} />

      {/* EHI Export */}
      <EhiExportSection ehiExport={results.ehiExport} />

      {/* Linked MyChart Accounts */}
      <LinkedAccountsSection linkedMyChartAccounts={results.linkedMyChartAccounts} />

      {/* Messages / Conversations */}
      <MessagingSection messages={results.messages} isDemo={isDemo} token={token} />

      {/* Raw JSON */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => setShowRawJson(!showRawJson)}>
            {showRawJson ? "Hide" : "Show"} Raw JSON
          </Button>
          {showRawJson && (
            <pre className="mt-4 bg-muted p-4 rounded-md text-xs overflow-auto max-h-96">
              {JSON.stringify(results, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      {/* Start Over */}
      <div className="text-center pb-8">
        <Button variant="outline" onClick={handleBack}>
          {isDemo ? "Back to Login" : "Scrape Another Account"}
        </Button>
      </div>
    </div>
    </SectionErrorBoundary>
      </div>
    </div>
  );
}
