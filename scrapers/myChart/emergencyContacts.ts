import { MyChartRequest } from "./myChartRequest";
import { getRequestVerificationTokenFromBody } from "./util";

export type EmergencyContact = {
  id?: string;
  name: string;
  relationshipType: string;
  phoneNumber: string;
  isEmergencyContact: boolean;
};

export type EmergencyContactInput = {
  name: string;
  relationshipType: string;
  phoneNumber: string;
};

export type EmergencyContactUpdateInput = {
  id: string;
  name?: string;
  relationshipType?: string;
  phoneNumber?: string;
};

export type EmergencyContactResult = {
  success: boolean;
  error?: string;
};

type RelationshipResponse = {
  name?: string;
  relationshipType?: string;
  phoneNumber?: string;
  isEmergencyContact?: boolean;
  id?: string;
};

type GetRelationshipsResponse = {
  relationships?: RelationshipResponse[];
};

async function getToken(mychartRequest: MyChartRequest): Promise<string | null> {
  const pageResp = await mychartRequest.makeRequest({ path: '/app/personal-information' });
  const html = await pageResp.text();
  return getRequestVerificationTokenFromBody(html);
}

export async function getEmergencyContacts(mychartRequest: MyChartRequest): Promise<EmergencyContact[]> {
  const token = await getToken(mychartRequest);

  if (!token) {
    console.log('Could not find request verification token for emergency contacts');
    return [];
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/personalInformation/GetRelationships',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({}),
  });

  const json: GetRelationshipsResponse = await resp.json();

  return (json.relationships || []).map((rel: RelationshipResponse) => ({
    ...(rel.id && { id: rel.id }),
    name: rel.name || '',
    relationshipType: rel.relationshipType || '',
    phoneNumber: rel.phoneNumber || '',
    isEmergencyContact: rel.isEmergencyContact || false,
  }));
}

export async function addEmergencyContact(
  mychartRequest: MyChartRequest,
  input: EmergencyContactInput
): Promise<EmergencyContactResult> {
  const token = await getToken(mychartRequest);

  if (!token) {
    return { success: false, error: 'Could not get verification token' };
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/personalInformation/AddRelationship',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({
      name: input.name,
      relationshipType: input.relationshipType,
      phoneNumber: input.phoneNumber,
      isEmergencyContact: true,
    }),
  });

  if (resp.status === 200) {
    return { success: true };
  }

  const text = await resp.text();
  return { success: false, error: `Add failed with status ${resp.status}: ${text}` };
}

export async function updateEmergencyContact(
  mychartRequest: MyChartRequest,
  input: EmergencyContactUpdateInput
): Promise<EmergencyContactResult> {
  const token = await getToken(mychartRequest);

  if (!token) {
    return { success: false, error: 'Could not get verification token' };
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/personalInformation/UpdateRelationship',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({
      id: input.id,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.relationshipType !== undefined && { relationshipType: input.relationshipType }),
      ...(input.phoneNumber !== undefined && { phoneNumber: input.phoneNumber }),
      isEmergencyContact: true,
    }),
  });

  if (resp.status === 200) {
    return { success: true };
  }

  const text = await resp.text();
  return { success: false, error: `Update failed with status ${resp.status}: ${text}` };
}

export async function removeEmergencyContact(
  mychartRequest: MyChartRequest,
  id: string
): Promise<EmergencyContactResult> {
  const token = await getToken(mychartRequest);

  if (!token) {
    return { success: false, error: 'Could not get verification token' };
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/personalInformation/RemoveRelationship',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({ id }),
  });

  if (resp.status === 200) {
    return { success: true };
  }

  const text = await resp.text();
  return { success: false, error: `Remove failed with status ${resp.status}: ${text}` };
}
