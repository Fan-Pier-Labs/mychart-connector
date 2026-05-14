import { MyChartRequest } from "../myChartRequest";
import { getRequestVerificationTokenFromBody } from "../util";

/**
 * Shape of a single note in a visit's Shared Notes tab.
 * Returned by /mychart/api/visit-notes/GetVisitNotes.
 */
export type VisitNote = {
  hnoId: string;
  hnoDat: string;
  displayName: string;
  iso: string;
  isAddendum: boolean;
  isNoteSensitive: boolean;
  providerName: string;
  providerMagicId: string;
};

export type GetVisitNotesResult = {
  csn: string;
  lrpId: string;
  depPhoneNumber: string;
  isAtLeastOneNoteSensitive: boolean;
  notes: VisitNote[];
};

type VisitNoteApiNote = {
  hnoID?: string;
  hnoDAT?: string;
  displayName?: string;
  iso?: string;
  isAddendum?: boolean;
  isNoteSensitive?: boolean;
  provider?: { name?: string; magicID?: string };
};

type GetVisitNotesApiResponse = {
  lrpID?: string;
  depPhoneNumber?: string;
  isAtLeastOneNoteSensitive?: boolean;
  noteList?: VisitNoteApiNote[];
};

type LoadReportContentApiResponse = {
  reportContent?: string;
  reportCss?: string;
  baseFontSize?: number;
  stylesheets?: string[];
};

export type NoteContent = {
  contentHtml: string;
  contentCss: string;
};

/**
 * Fetch the CSRF token. Uses /Visits/VisitsList for consistency with the
 * sibling visits scraper.
 */
async function fetchVisitToken(mychartRequest: MyChartRequest): Promise<string> {
  const pageResp = await mychartRequest.makeRequest({
    path: '/Visits/VisitsList?noCache=' + Math.random(),
  });
  const html = await pageResp.text();
  const token = getRequestVerificationTokenFromBody(html);
  if (!token) {
    throw new Error('Could not find request verification token for visit notes');
  }
  return token;
}

/**
 * Parse a JSON response, surfacing F5 Volterra WAF rejections (200 OK with
 * text/html "Request Rejected" body) as a clear authentication error rather
 * than letting JSON.parse throw 'Unexpected token <'.
 */
async function parseJsonOrWafError<T>(resp: Response, endpoint: string): Promise<T> {
  const contentType = resp.headers.get('content-type') || '';
  if (!contentType.includes('json')) {
    const server = resp.headers.get('server') || '';
    const bodyPreview = (await resp.text()).slice(0, 200);
    if (server.includes('volt') || bodyPreview.includes('Request Rejected')) {
      throw new Error(
        `MyChart WAF (${server || 'unknown'}) rejected ${endpoint}. ` +
        `The session is likely valid but the WAF blocked this request shape. ` +
        `Try refreshing your MyChart login.`
      );
    }
    throw new Error(
      `Expected JSON from ${endpoint} but got ${contentType || 'no content-type'}. ` +
      `Session may have expired.`
    );
  }
  return resp.json() as Promise<T>;
}

/**
 * List the clinical notes attached to a past visit.
 * Each note has the hnoId/hnoDat needed to fetch its content with getNoteContent().
 */
export async function getVisitNotes(
  mychartRequest: MyChartRequest,
  csn: string,
): Promise<GetVisitNotesResult> {
  const token = await fetchVisitToken(mychartRequest);

  const resp = await mychartRequest.makeRequest({
    path: '/api/visit-notes/GetVisitNotes',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      __requestverificationtoken: token,
    },
    body: JSON.stringify({ CSN: csn, FromPvdPage: true }),
  });

  const json = await parseJsonOrWafError<GetVisitNotesApiResponse>(
    resp,
    '/api/visit-notes/GetVisitNotes'
  );

  const notes: VisitNote[] = (json.noteList || []).map((n) => ({
    hnoId: n.hnoID || '',
    hnoDat: n.hnoDAT || '',
    displayName: n.displayName || '',
    iso: n.iso || '',
    isAddendum: !!n.isAddendum,
    isNoteSensitive: !!n.isNoteSensitive,
    providerName: n.provider?.name || '',
    providerMagicId: n.provider?.magicID || '',
  }));

  return {
    csn,
    lrpId: json.lrpID || '',
    depPhoneNumber: json.depPhoneNumber || '',
    isAtLeastOneNoteSensitive: !!json.isAtLeastOneNoteSensitive,
    notes,
  };
}

/**
 * Fetch the rendered HTML content of a single clinical note.
 * The lrpId is shared across all notes from a single visit; hnoId/hnoDat identify the note.
 */
export async function getNoteContent(
  mychartRequest: MyChartRequest,
  params: { csn: string; lrpId: string; hnoId: string; hnoDat: string },
): Promise<NoteContent> {
  const token = await fetchVisitToken(mychartRequest);

  const resp = await mychartRequest.makeRequest({
    path: '/api/report-content/LoadReportContent',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      __requestverificationtoken: token,
    },
    body: JSON.stringify({
      reportMnemonic: 'OPEN_NOTES',
      reportID: params.lrpId,
      contextID: params.hnoId,
      contextDAT: params.hnoDat,
      contextINI: 'HNO',
      csn: params.csn,
      isFullReportPage: false,
      uniqueClass: 'EID-1',
      nonce: '',
    }),
  });

  const json = await parseJsonOrWafError<LoadReportContentApiResponse>(
    resp,
    '/api/report-content/LoadReportContent'
  );

  return {
    contentHtml: json.reportContent || '',
    contentCss: json.reportCss || '',
  };
}

/**
 * Fetch the After Visit Summary (AVS) HTML for a past visit.
 * Uses the same /report-content endpoint with reportMnemonic=AMB_AVS.
 */
export async function getVisitAVS(
  mychartRequest: MyChartRequest,
  csn: string,
): Promise<NoteContent> {
  const token = await fetchVisitToken(mychartRequest);

  const resp = await mychartRequest.makeRequest({
    path: '/api/report-content/LoadReportContent',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      __requestverificationtoken: token,
    },
    body: JSON.stringify({
      reportMnemonic: 'AMB_AVS',
      reportID: '',
      csn,
      isFullReportPage: false,
      uniqueClass: 'EID-1',
      nonce: '',
    }),
  });

  const json = await parseJsonOrWafError<LoadReportContentApiResponse>(
    resp,
    '/api/report-content/LoadReportContent'
  );

  return {
    contentHtml: json.reportContent || '',
    contentCss: json.reportCss || '',
  };
}
