import { MyChartRequest } from "./myChartRequest";
import { getRequestVerificationTokenFromBody } from "./util";

export type Pharmacy = {
  name: string;
  phoneNumber: string;
  formattedAddress: string[];
}

export type Medication = {
  name: string;
  commonName: string;
  sig: string;
  dateToDisplay: string;
  startDate: string;
  authorizingProviderName: string;
  orderingProviderName: string;
  isRefillable: boolean;
  isPatientReported: boolean;
  pharmacy: Pharmacy | null;
  refillDetails: {
    writtenDispenseQuantity: string;
    daySupply: string;
  } | null;
  medicationKey: string | null;
}

export type MedicationsResult = {
  medications: Medication[];
  patientFirstName: string;
}

// API response types
type ProviderResponse = {
  name?: string;
}

type PharmacyResponse = {
  name?: string;
  phoneNumber?: string;
  formattedAddress?: string[];
}

type RefillDetailsResponse = {
  writtenDispenseQuantity?: string;
  daySupply?: string;
  isRefillable?: boolean;
  owningPharmacy?: PharmacyResponse;
}

type PrescriptionResponse = {
  name?: string;
  patientFriendlyName?: { text?: string };
  sig?: string;
  dateToDisplay?: string;
  startDate?: string;
  authorizingProvider?: ProviderResponse;
  orderingProvider?: ProviderResponse;
  isPatientReported?: boolean;
  refillDetails?: RefillDetailsResponse;
  medicationKey?: string;
}

type CommunityMemberResponse = {
  prescriptionList?: {
    prescriptions?: PrescriptionResponse[];
  };
}

type LoadMedicationsPageResponse = {
  communityMembers?: CommunityMemberResponse[];
  getPatientFirstName?: string;
}

export async function getMedications(mychartRequest: MyChartRequest): Promise<MedicationsResult> {
  const pageResp = await mychartRequest.makeRequest({ path: '/Clinical/Medications' });
  const html = await pageResp.text();
  const token = getRequestVerificationTokenFromBody(html);

  if (!token) {
    console.log('Could not find request verification token for medications');
    return { medications: [], patientFirstName: '' };
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/medications/LoadMedicationsPage',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({}),
  });

  const json: LoadMedicationsPageResponse = await resp.json();

  const medications: Medication[] = [];

  for (const member of json.communityMembers || []) {
    const prescriptions = member?.prescriptionList?.prescriptions || [];
    for (const rx of prescriptions) {
      const pharmacy = rx.refillDetails?.owningPharmacy;
      medications.push({
        name: rx.name || '',
        commonName: rx.patientFriendlyName?.text || '',
        sig: rx.sig || '',
        dateToDisplay: rx.dateToDisplay || '',
        startDate: rx.startDate || '',
        authorizingProviderName: rx.authorizingProvider?.name || '',
        orderingProviderName: rx.orderingProvider?.name || '',
        isRefillable: rx.refillDetails?.isRefillable || false,
        isPatientReported: rx.isPatientReported || false,
        pharmacy: pharmacy ? {
          name: pharmacy.name || '',
          phoneNumber: pharmacy.phoneNumber || '',
          formattedAddress: pharmacy.formattedAddress || [],
        } : null,
        refillDetails: rx.refillDetails ? {
          writtenDispenseQuantity: rx.refillDetails.writtenDispenseQuantity || '',
          daySupply: rx.refillDetails.daySupply || '',
        } : null,
        medicationKey: rx.medicationKey || null,
      });
    }
  }

  return {
    medications,
    patientFirstName: json.getPatientFirstName || '',
  };
}
