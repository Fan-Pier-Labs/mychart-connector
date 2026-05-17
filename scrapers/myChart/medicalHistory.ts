import { MyChartRequest } from "./myChartRequest";
import { getRequestVerificationTokenFromBody } from "./util";
import { logger } from '../../shared/logger';

export type Diagnosis = {
  diagnosisName: string;
  diagnosisDate: string;
}

export type Surgery = {
  surgeryName: string;
  surgeryDate: string;
}

export type FamilyMember = {
  relationshipToPatientName: string;
  statusName: string;
  conditions: string[];
}

export type MedicalHistoryResult = {
  medicalHistory: {
    diagnoses: Diagnosis[];
    notes: string;
  };
  surgicalHistory: {
    surgeries: Surgery[];
    notes: string;
  };
  familyHistory: {
    familyMembers: FamilyMember[];
  };
}

type DiagnosisResponse = {
  diagnosisName?: string;
  diagnosisDate?: string;
}

type SurgeryResponse = {
  surgeryName?: string;
  surgeryDate?: string;
}

type FamilyMemberResponse = {
  relationshipToPatientName?: string;
  statusName?: string;
  conditions?: string[];
}

type LoadHistoriesResponse = {
  medicalHistory?: {
    diagnoses?: DiagnosisResponse[];
    medicalHistoryNotes?: string;
  };
  surgicalHistory?: {
    surgeries?: SurgeryResponse[];
    surgicalHistoryNotes?: string;
  };
  familyHistoryAndStatus?: {
    familyMembers?: FamilyMemberResponse[];
  };
}

export async function getMedicalHistory(mychartRequest: MyChartRequest): Promise<MedicalHistoryResult> {
  const pageResp = await mychartRequest.makeRequest({ path: '/app/histories' });
  const html = await pageResp.text();
  const token = getRequestVerificationTokenFromBody(html);

  const empty: MedicalHistoryResult = {
    medicalHistory: { diagnoses: [], notes: '' },
    surgicalHistory: { surgeries: [], notes: '' },
    familyHistory: { familyMembers: [] },
  };

  if (!token) {
    logger.debug('Could not find request verification token for medical history');
    return empty;
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/histories/LoadHistoriesViewModel',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({}),
  });

  const json: LoadHistoriesResponse = await resp.json();

  return {
    medicalHistory: {
      diagnoses: (json.medicalHistory?.diagnoses || []).map((d: DiagnosisResponse) => ({
        diagnosisName: d.diagnosisName || '',
        diagnosisDate: d.diagnosisDate || '',
      })),
      notes: json.medicalHistory?.medicalHistoryNotes || '',
    },
    surgicalHistory: {
      surgeries: (json.surgicalHistory?.surgeries || []).map((s: SurgeryResponse) => ({
        surgeryName: s.surgeryName || '',
        surgeryDate: s.surgeryDate || '',
      })),
      notes: json.surgicalHistory?.surgicalHistoryNotes || '',
    },
    familyHistory: {
      familyMembers: (json.familyHistoryAndStatus?.familyMembers || []).map((m: FamilyMemberResponse) => ({
        relationshipToPatientName: m.relationshipToPatientName || '',
        statusName: m.statusName || '',
        conditions: (m.conditions || []).filter((c: string) => c && c.trim()),
      })),
    },
  };
}
