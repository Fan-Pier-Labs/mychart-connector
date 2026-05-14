import { MyChartRequest } from "./myChartRequest";
import { getRequestVerificationTokenFromBody, parseMyChartDate, sortNewestFirstByDate } from "./util";

export type Letter = {
  dateISO: string;
  reason: string;
  viewed: boolean;
  providerName: string;
  providerPhotoUrl: string;
  hnoId: string;
  csn: string;
}

type LetterResponse = {
  dateISO?: string;
  reason?: string;
  viewed?: boolean;
  empId?: string;
  hnoId?: string;
  csn?: string;
}

type LetterUserResponse = {
  name?: string;
  photoUrl?: string;
  empId?: string;
}

type GetLettersListResponse = {
  letters?: LetterResponse[];
  users?: Record<string, LetterUserResponse>;
}

export async function getLetters(mychartRequest: MyChartRequest): Promise<Letter[]> {
  const pageResp = await mychartRequest.makeRequest({ path: '/app/letters' });
  const html = await pageResp.text();
  const token = getRequestVerificationTokenFromBody(html);

  if (!token) {
    console.log('Could not find request verification token for letters');
    return [];
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/letters/GetLettersList',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({}),
  });

  const json: GetLettersListResponse = await resp.json();

  const users = json.users || {};

  const letters: Letter[] = (json.letters || []).map((letter: LetterResponse) => {
    const provider = users[letter.empId || ''] || {};
    return {
      dateISO: letter.dateISO || '',
      reason: letter.reason || '',
      viewed: letter.viewed || false,
      providerName: provider.name || '',
      providerPhotoUrl: provider.photoUrl || '',
      hnoId: letter.hnoId || '',
      csn: letter.csn || '',
    };
  });

  // Sort newest-first by dateISO. Letters with missing/unparseable dates go last.
  return sortNewestFirstByDate(letters, l => parseMyChartDate(l.dateISO));
}

export type LetterDetailsResponse = {
  bodyHTML: string;
}

export async function getLetterDetails(mychartRequest: MyChartRequest, hnoId: string, csn: string): Promise<LetterDetailsResponse> {
  const pageResp = await mychartRequest.makeRequest({ path: '/app/letters' });
  const html = await pageResp.text();
  const token = getRequestVerificationTokenFromBody(html);

  if (!token) {
    throw new Error('Could not find request verification token for letter details');
  }

  const resp = await mychartRequest.makeRequest({
    path: '/api/letters/GetLetterDetails',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify({ hnoId, csn }),
  });

  const json: LetterDetailsResponse = await resp.json();
  return json;
}
