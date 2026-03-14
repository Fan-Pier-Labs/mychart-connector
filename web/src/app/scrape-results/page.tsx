"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAppContext } from "@/lib/app-context";
import { DataRow, DataSection, ArraySection, BillingVisits, VisitsCard, VisitItem, LabItem, safeText } from "@/components/data-display";
import { SectionErrorBoundary } from "@/components/error-boundary";
import { CorrelatedTimeline } from "@/components/correlated-timeline";
import type {
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
  LetterType,
  DocumentType,
  ActivityFeedItemType,
  ImagingResultType,
  UpcomingOrderType,
  QuestionnaireType,
  CareJourneyType,
  EducationMaterialType,
  EhiTemplateType,
  LinkedMyChartAccountType,
  ConversationType,
  ConversationMessageType,
  PastVisitOrganization,
} from "@/types/scrape-results";
import type { BillingAccount } from "@/lib/mychart/bills/bills";
import type { LabTestResultWithHistory } from "../../../../scrapers/myChart/labs_and_procedure_results/labtestresulttype";

export default function ScrapeResultsPage() {
  const router = useRouter();
  const { results, isDemo, resetAll, token } = useAppContext();
  const [showRawJson, setShowRawJson] = useState(false);
  const [letterHtml, setLetterHtml] = useState<Record<string, string>>({});
  const [loadingLetters, setLoadingLetters] = useState<Record<string, boolean>>({});
  const [loadingStatements, setLoadingStatements] = useState<Record<string, boolean>>({});

  // Messaging state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [showComposeNew, setShowComposeNew] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [composeRecipients, setComposeRecipients] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [composeTopics, setComposeTopics] = useState<any[]>([]);
  const [composeLoading, setComposeLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sendingNew, setSendingNew] = useState(false);
  const [messageStatus, setMessageStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchLetterContent = useCallback(async (hnoId: string, csn: string) => {
    const key = `${hnoId}-${csn}`;
    if (letterHtml[key]) return;
    setLoadingLetters(prev => ({ ...prev, [key]: true }));
    try {
      const resp = await fetch('/api/letter-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, hnoId, csn }),
      });
      const data = await resp.json();
      if (data.bodyHTML) {
        setLetterHtml(prev => ({ ...prev, [key]: data.bodyHTML }));
      }
    } catch (err) {
      console.error('Failed to fetch letter:', err);
    } finally {
      setLoadingLetters(prev => ({ ...prev, [key]: false }));
    }
  }, [token, letterHtml]);

  const downloadLetterPdf = useCallback((hnoId: string, csn: string, reason: string) => {
    const key = `${hnoId}-${csn}`;
    const html = letterHtml[key];
    if (!html) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<!DOCTYPE html><html><head><title>${reason}</title><style>@media print { body { margin: 0; } }</style></head><body>${html}</body></html>`);
      printWindow.document.close();
    }
  }, [letterHtml]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchStatementPdf = useCallback(async (encBillingId: string, statement: any, action: 'view' | 'download') => {
    const key = `${statement.RecordID}-${statement.DateDisplay}`;
    setLoadingStatements(prev => ({ ...prev, [key]: true }));
    try {
      const resp = await fetch('/api/billing-statement-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, encBillingId, statement }),
      });
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      if (action === 'view') {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `Statement_${statement.FormattedDateDisplay || statement.DateDisplay}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to fetch statement PDF:', err);
    } finally {
      setLoadingStatements(prev => ({ ...prev, [key]: false }));
    }
  }, [token]);

  const handleSendReply = useCallback(async (conversationId: string) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    setMessageStatus(null);
    try {
      const resp = await fetch('/api/messages/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, conversationId, messageBody: replyText }),
      });
      const data = await resp.json();
      if (data.success) {
        setMessageStatus({ type: 'success', text: 'Reply sent successfully' });
        setReplyText("");
        setReplyingTo(null);
      } else {
        setMessageStatus({ type: 'error', text: data.error || 'Failed to send reply' });
      }
    } catch (err) {
      setMessageStatus({ type: 'error', text: (err as Error).message });
    } finally {
      setSendingReply(false);
    }
  }, [token, replyText]);

  const handleOpenCompose = useCallback(async () => {
    setShowComposeNew(true);
    if (composeRecipients.length > 0) return; // already loaded
    setComposeLoading(true);
    try {
      const resp = await fetch('/api/messages/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await resp.json();
      setComposeRecipients(data.recipients || []);
      setComposeTopics(data.topics || []);
      if (data.recipients?.length > 0) setSelectedRecipient(data.recipients[0]);
      if (data.topics?.length > 0) setSelectedTopic(data.topics[0]);
    } catch (err) {
      setMessageStatus({ type: 'error', text: 'Failed to load recipients: ' + (err as Error).message });
    } finally {
      setComposeLoading(false);
    }
  }, [token, composeRecipients.length]);

  const handleSendNew = useCallback(async () => {
    if (!selectedRecipient || !selectedTopic || !composeSubject.trim() || !composeBody.trim()) return;
    setSendingNew(true);
    setMessageStatus(null);
    try {
      const resp = await fetch('/api/messages/send-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          recipient: selectedRecipient,
          topic: selectedTopic,
          subject: composeSubject,
          messageBody: composeBody,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        setMessageStatus({ type: 'success', text: 'Message sent successfully' });
        setComposeSubject("");
        setComposeBody("");
        setShowComposeNew(false);
      } else {
        setMessageStatus({ type: 'error', text: data.error || 'Failed to send message' });
      }
    } catch (err) {
      setMessageStatus({ type: 'error', text: (err as Error).message });
    } finally {
      setSendingNew(false);
    }
  }, [token, selectedRecipient, selectedTopic, composeSubject, composeBody]);

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
    <div className="space-y-6">
      {isDemo && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm text-center">
          Viewing demo data for a sample patient. This is not real patient data.
        </div>
      )}

      {/* Correlated Timeline */}
      <SectionErrorBoundary fallbackTitle="Timeline rendering error">
        <CorrelatedTimeline data={results} />
      </SectionErrorBoundary>

      {/* Profile */}
      {results.profile && !results.profile.error && (
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
      )}

      {/* Health Summary */}
      <DataSection title="Health Summary" data={results.healthSummary}>
        {results.healthSummary && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <DataRow label="Age" value={results.healthSummary.patientAge} />
            <DataRow label="Blood Type" value={results.healthSummary.bloodType} />
            {results.healthSummary.height && (
              <DataRow label="Height" value={`${results.healthSummary.height.value} (${results.healthSummary.height.dateRecorded})`} />
            )}
            {results.healthSummary.weight && (
              <DataRow label="Weight" value={`${results.healthSummary.weight.value} (${results.healthSummary.weight.dateRecorded})`} />
            )}
            {results.healthSummary.lastVisit && (
              <DataRow label="Last Visit" value={`${results.healthSummary.lastVisit.date} - ${results.healthSummary.lastVisit.visitType}`} />
            )}
          </div>
        )}
      </DataSection>

      {/* Medications */}
      <SectionErrorBoundary fallbackTitle="Medications rendering error">
      <DataSection title="Medications" data={results.medications} count={results.medications?.medications?.length}>
        {results.medications?.medications?.map((med: MedicationType, i: number) => (
          <div key={i} className="bg-muted rounded-md p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{safeText(med.name)}</span>
              {med.isRefillable && <Badge variant="outline" className="text-[10px]">Refillable</Badge>}
              {med.isPatientReported && <Badge variant="secondary" className="text-[10px]">Self-reported</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{safeText(med.sig)}</p>
            <div className="flex gap-4 text-xs text-muted-foreground mt-1">
              {med.authorizingProviderName && <span>Prescriber: {safeText(med.authorizingProviderName)}</span>}
              {med.pharmacy?.name && <span>Pharmacy: {safeText(med.pharmacy.name)}</span>}
            </div>
          </div>
        ))}
      </DataSection>
      </SectionErrorBoundary>

      {/* Allergies */}
      <SectionErrorBoundary fallbackTitle="Allergies rendering error">
      <DataSection title="Allergies" data={results.allergies} count={results.allergies?.allergies?.length}>
        {results.allergies?.allergies?.map((a: AllergyType, i: number) => (
          <div key={i} className="flex items-center justify-between bg-muted rounded-md p-3 text-sm">
            <div>
              <span className="font-medium">{safeText(a.name)}</span>
              <span className="text-xs text-muted-foreground ml-2">({safeText(a.type)})</span>
              {a.reaction && <p className="text-xs text-muted-foreground">Reaction: {safeText(a.reaction)}</p>}
            </div>
            {a.severity && (
              <Badge variant={a.severity === 'Severe' ? 'destructive' : 'outline'} className="text-[10px]">
                {safeText(a.severity)}
              </Badge>
            )}
          </div>
        ))}
      </DataSection>
      </SectionErrorBoundary>

      {/* Immunizations */}
      <SectionErrorBoundary fallbackTitle="Immunizations rendering error">
      <ArraySection title="Immunizations" data={results.immunizations}>
        {Array.isArray(results.immunizations) && results.immunizations.map((imm: ImmunizationType, i: number) => (
          <div key={i} className="bg-muted rounded-md p-3 text-sm">
            <span className="font-medium">{safeText(imm.name)}</span>
            <p className="text-xs text-muted-foreground mt-1">
              Dates: {Array.isArray(imm.administeredDates) ? imm.administeredDates.map(d => safeText(d)).join(', ') : safeText(imm.administeredDates)}
            </p>
            {imm.organizationName && (
              <p className="text-xs text-muted-foreground">Facility: {safeText(imm.organizationName)}</p>
            )}
          </div>
        ))}
      </ArraySection>
      </SectionErrorBoundary>

      {/* Insurance */}
      <SectionErrorBoundary fallbackTitle="Insurance rendering error">
      <DataSection title="Insurance" data={results.insurance} count={results.insurance?.coverages?.length}>
        {results.insurance?.coverages?.map((cov: InsuranceCoverageType, i: number) => (
          <div key={i} className="bg-muted rounded-md p-3 text-sm">
            <span className="font-medium">{safeText(cov.planName)}</span>
            <div className="grid grid-cols-2 gap-1 mt-1 text-xs text-muted-foreground">
              {cov.subscriberName && <span>Subscriber: {safeText(cov.subscriberName)}</span>}
              {cov.memberId && <span>Member ID: {safeText(cov.memberId)}</span>}
              {cov.groupNumber && <span>Group: {safeText(cov.groupNumber)}</span>}
            </div>
            {cov.details?.map((d: string, j: number) => (
              <p key={j} className="text-xs text-muted-foreground">{safeText(d)}</p>
            ))}
          </div>
        ))}
      </DataSection>
      </SectionErrorBoundary>

      {/* Care Team */}
      <SectionErrorBoundary fallbackTitle="Care Team rendering error">
      <ArraySection title="Care Team" data={results.careTeam}>
        {Array.isArray(results.careTeam) && results.careTeam.map((m: CareTeamMemberType, i: number) => (
          <div key={i} className="bg-muted rounded-md p-3 text-sm">
            <span className="font-medium">{safeText(m.name)}</span>
            {m.role && <Badge variant="outline" className="text-[10px] ml-2">{safeText(m.role)}</Badge>}
            {m.specialty && <p className="text-xs text-muted-foreground mt-1">{safeText(m.specialty)}</p>}
          </div>
        ))}
      </ArraySection>
      </SectionErrorBoundary>

      {/* Referrals */}
      <SectionErrorBoundary fallbackTitle="Referrals rendering error">
      <ArraySection title="Referrals" data={results.referrals}>
        {Array.isArray(results.referrals) && results.referrals.map((ref: ReferralType, i: number) => (
          <div key={i} className="bg-muted rounded-md p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{safeText(ref.referredByProviderName)} → {safeText(ref.referredToProviderName)}</span>
              <Badge variant={ref.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                {safeText(ref.statusString)}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {ref.referredToFacility && <span>Facility: {safeText(ref.referredToFacility)}</span>}
              {ref.startDate && <span className="ml-3">{safeText(ref.startDate)} - {safeText(ref.endDate)}</span>}
            </div>
          </div>
        ))}
      </ArraySection>
      </SectionErrorBoundary>

      {/* Health Issues */}
      <SectionErrorBoundary fallbackTitle="Health Issues rendering error">
      <ArraySection title="Health Issues" data={results.healthIssues}>
        {Array.isArray(results.healthIssues) && results.healthIssues.map((hi: HealthIssueType, i: number) => (
          <div key={i} className="flex items-center justify-between bg-muted rounded-md p-3 text-sm">
            <div>
              <span className="font-medium">{safeText(hi.name)}</span>
              {hi.formattedDateNoted && <span className="text-xs text-muted-foreground ml-2">Noted: {safeText(hi.formattedDateNoted)}</span>}
            </div>
          </div>
        ))}
      </ArraySection>
      </SectionErrorBoundary>

      {/* Vitals */}
      <ArraySection title="Vitals" data={results.vitals}>
        {Array.isArray(results.vitals) && results.vitals.map((flowsheet: FlowsheetType, i: number) => (
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
      </ArraySection>

      {/* Emergency Contacts */}
      <ArraySection title="Emergency Contacts" data={results.emergencyContacts}>
        {Array.isArray(results.emergencyContacts) && results.emergencyContacts.map((ec: EmergencyContactType, i: number) => (
          <div key={i} className="bg-muted rounded-md p-3 text-sm">
            <span className="font-medium">{ec.name}</span>
            <span className="text-xs text-muted-foreground ml-2">({ec.relationshipType})</span>
            {ec.phoneNumber && <p className="text-xs text-muted-foreground mt-1">{ec.phoneNumber}</p>}
            {ec.isEmergencyContact && <Badge variant="outline" className="text-[10px] mt-1">Emergency Contact</Badge>}
          </div>
        ))}
      </ArraySection>

      {/* Medical History */}
      <DataSection title="Medical History" data={results.medicalHistory}>
        {results.medicalHistory && (
          <div className="space-y-4">
            {(results.medicalHistory.medicalHistory?.diagnoses?.length ?? 0) > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Diagnoses</h4>
                {results.medicalHistory.medicalHistory!.diagnoses.map((d: DiagnosisType, i: number) => (
                  <div key={i} className="text-xs text-muted-foreground">
                    {d.diagnosisName} {d.diagnosisDate && `(${d.diagnosisDate})`}
                  </div>
                ))}
              </div>
            )}
            {(results.medicalHistory.surgicalHistory?.surgeries?.length ?? 0) > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Surgical History</h4>
                {results.medicalHistory.surgicalHistory!.surgeries.map((s: SurgeryType, i: number) => (
                  <div key={i} className="text-xs text-muted-foreground">
                    {s.surgeryName} {s.surgeryDate && `(${s.surgeryDate})`}
                  </div>
                ))}
              </div>
            )}
            {(results.medicalHistory.familyHistory?.familyMembers?.length ?? 0) > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Family History</h4>
                {results.medicalHistory.familyHistory!.familyMembers.map((m: FamilyMemberType, i: number) => (
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
      </DataSection>

      {/* Preventive Care */}
      <ArraySection title="Preventive Care" data={results.preventiveCare}>
        {Array.isArray(results.preventiveCare) && results.preventiveCare.map((item: PreventiveCareType, i: number) => (
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
      </ArraySection>

      {/* Goals */}
      <DataSection title="Goals" data={results.goals}>
        {results.goals && (
          <div className="space-y-3">
            {results.goals.careTeamGoals?.map((g: GoalType, i: number) => (
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
            {results.goals.patientGoals?.map((g: GoalType, i: number) => (
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
      </DataSection>

      {/* Letters */}
      <ArraySection title="Letters" data={results.letters}>
        {Array.isArray(results.letters) && results.letters.map((l: LetterType, i: number) => {
          const key = `${l.hnoId}-${l.csn}`;
          const hasContent = !!letterHtml[key];
          const isLoading = loadingLetters[key];
          return (
            <div key={i} className="bg-muted rounded-md p-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{l.reason}</span>
                  <p className="text-xs text-muted-foreground">{l.providerName} - {l.dateISO}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!l.viewed && <Badge variant="default" className="text-[10px]">New</Badge>}
                  {!isDemo && l.hnoId && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        disabled={isLoading}
                        onClick={() => {
                          if (hasContent) {
                            setLetterHtml(prev => {
                              const next = { ...prev };
                              delete next[key];
                              return next;
                            });
                          } else {
                            fetchLetterContent(l.hnoId, l.csn);
                          }
                        }}
                      >
                        {isLoading ? 'Loading...' : hasContent ? 'Hide' : 'View Letter'}
                      </Button>
                      {hasContent && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => downloadLetterPdf(l.hnoId, l.csn, l.reason)}
                        >
                          Open PDF
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
              {hasContent && (
                <div
                  className="mt-3 border rounded bg-white p-4 text-xs overflow-auto max-h-96"
                  dangerouslySetInnerHTML={{ __html: letterHtml[key] }}
                />
              )}
            </div>
          );
        })}
      </ArraySection>

      {/* Documents */}
      <ArraySection title="Documents" data={results.documents}>
        {Array.isArray(results.documents) && results.documents.map((doc: DocumentType, i: number) => (
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
      </ArraySection>

      {/* Activity Feed */}
      <SectionErrorBoundary fallbackTitle="Activity Feed rendering error">
      <ArraySection title="Activity Feed" data={results.activityFeed}>
        {Array.isArray(results.activityFeed) && results.activityFeed.map((item: ActivityFeedItemType, i: number) => (
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
      </ArraySection>
      </SectionErrorBoundary>

      {/* Billing */}
      <SectionErrorBoundary fallbackTitle="Billing rendering error">
      {results.billing && Array.isArray(results.billing) && results.billing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.billing.map((account: BillingAccount, i: number) => {
              const allStatements = [
                ...(account.statementList?.DataStatement?.StatementList || []),
                ...(account.statementList?.DataDetailBill?.StatementList || []),
              ];
              return (
                <div key={i}>
                  <h3 className="font-semibold">
                    Guarantor #{account.guarantorNumber} ({account.patientName})
                  </h3>
                  {account.amountDue !== undefined && (
                    <p className="text-sm text-muted-foreground">
                      Amount Due: ${account.amountDue?.toFixed(2)}
                    </p>
                  )}

                  {/* Billing Statements / PDFs */}
                  {allStatements.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-semibold mb-2">Statements & Bills ({allStatements.length})</h4>
                      <div className="space-y-2">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {allStatements.map((stmt: any, j: number) => {
                          const stmtKey = `${stmt.RecordID}-${stmt.DateDisplay}`;
                          const stmtLoading = loadingStatements[stmtKey];
                          return (
                            <div key={j} className="flex items-center justify-between bg-muted rounded-md p-3 text-sm">
                              <div>
                                <span className="font-medium">{safeText(stmt.Description) || 'Statement'}</span>
                                <p className="text-xs text-muted-foreground">
                                  {safeText(stmt.FormattedDateDisplay || stmt.DateDisplay)}
                                  {stmt.StatementAmountDisplay && ` - ${safeText(stmt.StatementAmountDisplay)}`}
                                </p>
                              </div>
                              {!isDemo && account.encBillingId && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7"
                                    disabled={stmtLoading}
                                    onClick={() => fetchStatementPdf(account.encBillingId!, stmt, 'view')}
                                  >
                                    {stmtLoading ? 'Loading...' : 'View PDF'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7"
                                    disabled={stmtLoading}
                                    onClick={() => fetchStatementPdf(account.encBillingId!, stmt, 'download')}
                                  >
                                    Download PDF
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {account.billingDetails?.Data && (
                    <BillingVisits
                      visits={[
                        ...(account.billingDetails.Data.UnifiedVisitList || []),
                        ...(account.billingDetails.Data.InformationalVisitList || []),
                      ]}
                    />
                  )}
                  {i < (results.billing as BillingAccount[]).length - 1 && <Separator className="mt-4" />}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      </SectionErrorBoundary>

      {/* Upcoming Visits */}
      <SectionErrorBoundary fallbackTitle="Upcoming Visits rendering error">
      <VisitsCard
        title="Upcoming Visits"
        data={results.upcomingVisits}
        getVisits={(d) => {
          const visits = d as NonNullable<typeof results.upcomingVisits>;
          return [
            ...(visits?.LaterVisitsList || []),
            ...(visits?.NextNDaysVisits || []),
            ...(visits?.InProgressVisits || []),
          ];
        }}
      />
      </SectionErrorBoundary>

      {/* Past Visits */}
      <SectionErrorBoundary fallbackTitle="Past Visits rendering error">
      {results.pastVisits && !results.pastVisits?.error && results.pastVisits?.List && (
        <Card>
          <CardHeader>
            <CardTitle>Past Visits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.values(results.pastVisits.List)
              .flatMap((org: PastVisitOrganization) => org.List || [])
              .slice(0, 20)
              .map((v, i: number) => (
                <VisitItem key={i} visit={v} />
              ))}
          </CardContent>
        </Card>
      )}
      </SectionErrorBoundary>

      {/* Lab Results */}
      <SectionErrorBoundary fallbackTitle="Lab Results rendering error">
      {results.labResults && Array.isArray(results.labResults) && results.labResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lab Results ({results.labResults.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.labResults.slice(0, 15).map((lab: LabTestResultWithHistory, i: number) => (
              <LabItem key={i} lab={lab} />
            ))}
          </CardContent>
        </Card>
      )}
      </SectionErrorBoundary>

      {/* Imaging Results */}
      <SectionErrorBoundary fallbackTitle="Imaging Results rendering error">
      <ArraySection title="Imaging Results" data={results.imagingResults}>
        {Array.isArray(results.imagingResults) && results.imagingResults.map((img: ImagingResultType, i: number) => (
          <div key={i} className="bg-muted rounded-md p-3 text-sm">
            <span className="font-semibold">{img.orderName}</span>
            <div className="flex gap-3 text-xs text-muted-foreground mt-1">
              {img.resultDate && <span>{img.resultDate}</span>}
              {img.orderProvider && <span>Provider: {img.orderProvider}</span>}
              {img.imageStudyCount > 0 && <span>{img.imageStudyCount} studies</span>}
              {img.scanCount > 0 && <span>{img.scanCount} scans</span>}
            </div>
            {img.impression && (
              <div className="mt-2">
                <span className="text-xs font-medium">Impression:</span>
                <p className="text-xs text-muted-foreground">{img.impression}</p>
              </div>
            )}
            {img.narrative && (
              <details className="mt-1">
                <summary className="text-xs font-medium cursor-pointer">Full Report</summary>
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{img.narrative}</p>
              </details>
            )}
          </div>
        ))}
      </ArraySection>
      </SectionErrorBoundary>

      {/* Upcoming Orders */}
      <SectionErrorBoundary fallbackTitle="Upcoming Orders rendering error">
      <ArraySection title="Upcoming Orders" data={results.upcomingOrders}>
        {Array.isArray(results.upcomingOrders) && results.upcomingOrders.map((order: UpcomingOrderType, i: number) => (
          <div key={i} className="bg-muted rounded-md p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{safeText(order.orderName)}</span>
              <Badge variant="outline" className="text-[10px]">{safeText(order.orderType)}</Badge>
              <Badge variant="secondary" className="text-[10px]">{safeText(order.status)}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {safeText(order.orderedByProvider)} - {safeText(order.orderedDate)}
              {order.facilityName && ` | ${safeText(order.facilityName)}`}
            </p>
          </div>
        ))}
      </ArraySection>
      </SectionErrorBoundary>

      {/* Questionnaires */}
      <SectionErrorBoundary fallbackTitle="Questionnaires rendering error">
      <ArraySection title="Questionnaires" data={results.questionnaires}>
        {Array.isArray(results.questionnaires) && results.questionnaires.map((q: QuestionnaireType, i: number) => (
          <div key={i} className="flex items-center justify-between bg-muted rounded-md p-3 text-sm">
            <div>
              <span className="font-medium">{safeText(q.name)}</span>
              {q.dueDate && <p className="text-xs text-muted-foreground">Due: {safeText(q.dueDate)}</p>}
              {q.completedDate && <p className="text-xs text-muted-foreground">Completed: {safeText(q.completedDate)}</p>}
            </div>
            <Badge variant={q.status === 'Pending' ? 'default' : 'secondary'} className="text-[10px]">
              {safeText(q.status)}
            </Badge>
          </div>
        ))}
      </ArraySection>
      </SectionErrorBoundary>

      {/* Care Journeys */}
      <SectionErrorBoundary fallbackTitle="Care Journeys rendering error">
      <ArraySection title="Care Journeys" data={results.careJourneys}>
        {Array.isArray(results.careJourneys) && results.careJourneys.map((cj: CareJourneyType, i: number) => (
          <div key={i} className="bg-muted rounded-md p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{safeText(cj.name)}</span>
              <Badge variant="outline" className="text-[10px]">{safeText(cj.status)}</Badge>
            </div>
            {cj.description && <p className="text-xs text-muted-foreground mt-1">{safeText(cj.description)}</p>}
            {cj.providerName && <p className="text-xs text-muted-foreground">Provider: {safeText(cj.providerName)}</p>}
          </div>
        ))}
      </ArraySection>
      </SectionErrorBoundary>

      {/* Education Materials */}
      <SectionErrorBoundary fallbackTitle="Education Materials rendering error">
      <ArraySection title="Education Materials" data={results.educationMaterials}>
        {Array.isArray(results.educationMaterials) && results.educationMaterials.map((ed: EducationMaterialType, i: number) => (
          <div key={i} className="bg-muted rounded-md p-3 text-sm">
            <span className="font-medium">{safeText(ed.title)}</span>
            <div className="text-xs text-muted-foreground mt-1">
              {ed.category && <span>{safeText(ed.category)}</span>}
              {ed.providerName && <span className="ml-3">Assigned by: {safeText(ed.providerName)}</span>}
              {ed.assignedDate && <span className="ml-3">{safeText(ed.assignedDate)}</span>}
            </div>
          </div>
        ))}
      </ArraySection>
      </SectionErrorBoundary>

      {/* EHI Export */}
      <SectionErrorBoundary fallbackTitle="Health Information Export rendering error">
      <ArraySection title="Health Information Export" data={results.ehiExport}>
        {Array.isArray(results.ehiExport) && results.ehiExport.map((t: EhiTemplateType, i: number) => (
          <div key={i} className="bg-muted rounded-md p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{safeText(t.name)}</span>
              <Badge variant="outline" className="text-[10px]">{safeText(t.format)}</Badge>
            </div>
            {t.description && <p className="text-xs text-muted-foreground mt-1">{safeText(t.description)}</p>}
          </div>
        ))}
      </ArraySection>
      </SectionErrorBoundary>

      {/* Linked MyChart Accounts */}
      <SectionErrorBoundary fallbackTitle="Linked MyChart Accounts rendering error">
      <ArraySection title="Linked MyChart Accounts" data={results.linkedMyChartAccounts}>
        {Array.isArray(results.linkedMyChartAccounts) && results.linkedMyChartAccounts.map((acct: LinkedMyChartAccountType, i: number) => (
          <div key={i} className="flex items-center gap-3 bg-muted rounded-md p-3 text-sm">
            {acct.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={acct.logoUrl} alt={safeText(acct.name)} className="h-8 w-8 object-contain" />
            )}
            <div>
              <span className="font-medium">{safeText(acct.name)}</span>
              {acct.lastEncounter && (
                <p className="text-xs text-muted-foreground">Last encounter: {safeText(acct.lastEncounter)}</p>
              )}
            </div>
          </div>
        ))}
      </ArraySection>
      </SectionErrorBoundary>

      {/* Messages / Conversations */}
      <SectionErrorBoundary fallbackTitle="Conversations rendering error">
      {results.messages && !results.messages?.error && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Conversations
                {results.messages?.conversations?.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({results.messages.conversations.length})
                  </span>
                )}
              </CardTitle>
              {!isDemo && (
                <Button
                  variant={showComposeNew ? "secondary" : "default"}
                  size="sm"
                  onClick={() => showComposeNew ? setShowComposeNew(false) : handleOpenCompose()}
                >
                  {showComposeNew ? "Cancel" : "New Message"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Status message */}
            {messageStatus && (
              <div className={`p-2 rounded-md text-sm ${
                messageStatus.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {messageStatus.text}
              </div>
            )}

            {/* Compose new message form */}
            {showComposeNew && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-3">
                <h4 className="font-semibold text-sm">New Message</h4>
                {composeLoading ? (
                  <p className="text-sm text-muted-foreground">Loading recipients...</p>
                ) : (
                  <>
                    <div>
                      <label className="text-xs font-medium block mb-1">To</label>
                      <select
                        className="w-full border rounded-md p-2 text-sm bg-white"
                        value={selectedRecipient ? JSON.stringify(selectedRecipient) : ''}
                        onChange={(e) => setSelectedRecipient(JSON.parse(e.target.value))}
                      >
                        {composeRecipients.map((r, i) => (
                          <option key={i} value={JSON.stringify(r)}>
                            {r.displayName}{r.specialty ? ` (${r.specialty})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">Topic</label>
                      <select
                        className="w-full border rounded-md p-2 text-sm bg-white"
                        value={selectedTopic ? JSON.stringify(selectedTopic) : ''}
                        onChange={(e) => setSelectedTopic(JSON.parse(e.target.value))}
                      >
                        {composeTopics.map((t, i) => (
                          <option key={i} value={JSON.stringify(t)}>
                            {t.displayName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">Subject</label>
                      <input
                        type="text"
                        className="w-full border rounded-md p-2 text-sm"
                        placeholder="Subject"
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">Message</label>
                      <textarea
                        className="w-full border rounded-md p-2 text-sm min-h-[100px]"
                        placeholder="Type your message..."
                        value={composeBody}
                        onChange={(e) => setComposeBody(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={sendingNew || !composeSubject.trim() || !composeBody.trim()}
                        onClick={handleSendNew}
                      >
                        {sendingNew ? "Sending..." : "Send Message"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowComposeNew(false)}>
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {results.messages?.conversations?.map((convo: ConversationType, i: number) => (
              <details key={i} className="bg-muted rounded-md">
                <summary className="p-3 text-sm cursor-pointer hover:bg-muted/80">
                  <div className="inline">
                    <span className="font-medium">{convo.subject}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {convo.senderName} - {convo.lastMessageDate}
                    </span>
                    {convo.messages && convo.messages.length > 0 && (
                      <Badge variant="outline" className="text-[10px] ml-2">
                        {convo.messages.length} message{convo.messages.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  {(!convo.messages || convo.messages.length === 0) && convo.preview && (
                    <p className="text-xs text-muted-foreground mt-1 ml-4">{convo.preview}</p>
                  )}
                </summary>
                {convo.messages && convo.messages.length > 0 && (
                  <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
                    {convo.messages.map((msg: ConversationMessageType, j: number) => (
                      <div
                        key={j}
                        className={`rounded-md p-2 text-xs ${
                          msg.isFromPatient
                            ? 'bg-blue-50 border border-blue-200 ml-8'
                            : 'bg-white border border-gray-200 mr-8'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">
                            {msg.senderName}
                            {msg.isFromPatient && (
                              <span className="text-blue-600 ml-1">(you)</span>
                            )}
                          </span>
                          <span className="text-muted-foreground">{msg.sentDate}</span>
                        </div>
                        <div
                          className="text-xs whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: msg.messageBody }}
                        />
                      </div>
                    ))}

                    {/* Reply section */}
                    {!isDemo && (
                      <div className="pt-2 border-t border-border/30">
                        {replyingTo === convo.conversationId ? (
                          <div className="space-y-2">
                            <textarea
                              ref={replyTextareaRef}
                              className="w-full border rounded-md p-2 text-sm min-h-[80px]"
                              placeholder="Type your reply..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                  handleSendReply(convo.conversationId);
                                }
                              }}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={sendingReply || !replyText.trim()}
                                onClick={() => handleSendReply(convo.conversationId)}
                              >
                                {sendingReply ? "Sending..." : "Send Reply"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setReplyingTo(null); setReplyText(""); }}
                              >
                                Cancel
                              </Button>
                              <span className="text-xs text-muted-foreground self-center">
                                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to send
                              </span>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              setReplyingTo(convo.conversationId);
                              setReplyText("");
                              setTimeout(() => replyTextareaRef.current?.focus(), 50);
                            }}
                          >
                            Reply
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </details>
            )) ?? (
              <p className="text-sm text-muted-foreground">
                Response keys: {Object.keys(results.messages || {}).join(", ")}
              </p>
            )}
          </CardContent>
        </Card>
      )}
      </SectionErrorBoundary>

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
      </div>
    </div>
  );
}
