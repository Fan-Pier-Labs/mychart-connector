import { NextRequest, NextResponse } from 'next/server';
import { createSession, validateSession, sessionCookieHeader } from '@/lib/session';
import {
  loginPage, loginPageControllerJs, doLoginSuccess, doLoginFailed,
  secondaryValidationPage, homePage, csrfTokenPage, genericTokenPage,
  careTeamPage, insurancePage, preventiveCarePage, billingSummaryPage, billingDetailsPage,
} from '@/lib/html';
import * as homer from '@/data/homer';

// ─── In-memory mutable state (seeded from homer.ts) ─────────────────
// Deep-clone so mutations don't affect the seed module
// eslint-disable-next-line prefer-const
let conversationsState = JSON.parse(JSON.stringify(homer.conversations));
let composeIdCounter = 1000;

// ─── Helpers ────────────────────────────────────────────────────────
function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function html(body: string, status = 200) {
  return new NextResponse(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function joinPath(path: string[]): string {
  return path.join('/');
}

function requireSession(request: NextRequest): NextResponse | null {
  const cookie = request.headers.get('cookie');
  if (!validateSession(cookie)) {
    return NextResponse.redirect(new URL('/MyChart/Authentication/Login', request.url), 302);
  }
  return null;
}

function acceptAny(): boolean {
  return process.env.FAKE_MYCHART_ACCEPT_ANY === 'true';
}

// ─── Route handler ──────────────────────────────────────────────────
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const joined = joinPath(path);
  const lower = joined.toLowerCase();

  // ── Authentication ──────────────────────────────────────────────
  if (lower === 'authentication/login') {
    return html(loginPage());
  }

  if (lower.includes('loginpagecontroller.min.js')) {
    return new NextResponse(loginPageControllerJs(), { headers: { 'Content-Type': 'application/javascript' } });
  }

  if (lower === 'authentication/secondaryvalidation') {
    return html(secondaryValidationPage());
  }

  if (lower.startsWith('authentication/secondaryvalidation/getsmsconsentstrings')) {
    return html('OK');
  }

  if (lower === 'inside.asp') {
    return html('Welcome to MyChart');
  }

  // ── Session / Home ─────────────────────────────────────────────
  if (lower === 'home') {
    const cookie = request.headers.get('cookie');
    if (!validateSession(cookie)) {
      return NextResponse.redirect(new URL('/MyChart/Authentication/Login', request.url), 302);
    }
    return html(homePage(homer.profile.name, homer.profile.dob, homer.profile.mrn, homer.profile.pcp));
  }

  if (lower.startsWith('home/csrftoken')) {
    return html(csrfTokenPage());
  }

  if (lower === 'home/keepalive' || lower === 'keepalive.asp') {
    return new NextResponse('1');
  }

  // ── HTML pages parsed by cheerio ───────────────────────────────
  if (lower === 'clinical/careteam') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(careTeamPage(homer.careTeam));
  }

  if (lower === 'insurance') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(insurancePage(homer.insurance));
  }

  if (lower === 'healthadvisories') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(preventiveCarePage(homer.preventiveCare));
  }

  if (lower === 'billing/summary') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(billingSummaryPage(homer.billingSummary));
  }

  if (lower === 'billing/details') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(billingDetailsPage(homer.billingEncId));
  }

  if (lower.startsWith('billing/details/getvisits')) {
    return json(homer.billingVisits);
  }

  if (lower.startsWith('billing/details/getstatementlist')) {
    return json(homer.billingStatements);
  }

  if (lower.startsWith('billing/details/downloadfromblob')) {
    // Return a minimal fake PDF
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A]); // %PDF-1.4\n
    return new NextResponse(pdfBytes, { headers: { 'Content-Type': 'application/pdf' } });
  }

  // ── Generic token pages (for scrapers that GET a page to extract CSRF) ──
  if (lower === 'clinical/medications' || lower === 'clinical/allergies' ||
      lower === 'clinical/immunizations' || lower === 'clinical/healthissues' ||
      lower === 'personalinformation' || lower === 'questionnaire' ||
      lower === 'community/manage' ||
      lower.startsWith('app/')) {
    return html(genericTokenPage('MyChart'));
  }

  // Fallback: return a token page for any unknown GET
  return html(genericTokenPage('MyChart'));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const joined = joinPath(path);
  const lower = joined.toLowerCase();

  // ── Authentication ──────────────────────────────────────────────
  if (lower === 'authentication/login/dologin') {
    const body = await request.text();
    const searchParams = new URLSearchParams(body);
    const loginInfoRaw = searchParams.get('LoginInfo');

    if (!loginInfoRaw) {
      return html(doLoginFailed());
    }

    try {
      const loginInfo = JSON.parse(loginInfoRaw);
      const creds = loginInfo.Credentials;
      // Support both Username and LoginIdentifier
      const userB64 = creds.Username || creds.LoginIdentifier || '';
      const passB64 = creds.Password || '';

      let user: string, pass: string;
      try {
        user = atob(userB64);
        pass = atob(passB64);
      } catch {
        return html(doLoginFailed());
      }

      const validCreds = acceptAny() ||
        (user === homer.DEFAULT_USERNAME && pass === homer.DEFAULT_PASSWORD);

      if (!validCreds) {
        return html(doLoginFailed());
      }

      // Successful login — create session and set cookie
      const sessionId = createSession();
      const response = html(doLoginSuccess());
      response.headers.set('Set-Cookie', sessionCookieHeader(sessionId));
      return response;

    } catch {
      return html(doLoginFailed());
    }
  }

  // ── 2FA ────────────────────────────────────────────────────────
  if (lower.startsWith('authentication/secondaryvalidation/sendcode')) {
    return html('Code sent');
  }

  if (lower.startsWith('authentication/secondaryvalidation/validate')) {
    const body = await request.text();
    if (body.includes('123456') || acceptAny()) {
      const sessionId = createSession();
      const response = json({ Success: true });
      response.headers.set('Set-Cookie', sessionCookieHeader(sessionId));
      return response;
    }
    return json({ Success: false, TwoFactorCodeFailReason: 'codewrong' });
  }

  // ── JSON API endpoints ────────────────────────────────────────
  // Medications
  if (lower === 'api/medications/loadmedicationspage') {
    return json(homer.medications);
  }
  if (lower === 'api/medications/requestrefill') {
    return json({ success: true });
  }

  // Allergies
  if (lower === 'api/allergies/loadallergies') {
    return json(homer.allergies);
  }

  // Immunizations
  if (lower === 'api/immunizations/loadimmunizations') {
    return json(homer.immunizations);
  }

  // Health Issues
  if (lower === 'api/healthissues/loadhealthissuesdata') {
    return json(homer.healthIssues);
  }

  // Health Summary
  if (lower === 'api/health-summary/fetchhealthsummary') {
    return json(homer.healthSummary);
  }
  if (lower === 'api/health-summary/fetchh2gheader') {
    return json(homer.healthSummaryHeader);
  }

  // Vitals / Flowsheets
  if (lower === 'api/track-my-health/getflowsheets') {
    return json(homer.vitals);
  }

  // Medical History
  if (lower === 'api/histories/loadhistoriesviewmodel') {
    return json(homer.medicalHistory);
  }

  // Care Journeys
  if (lower === 'api/care-journeys/getcarejourneys') {
    return json(homer.careJourneys);
  }

  // Goals
  if (lower === 'api/goals/loadcareteamgoals') {
    return json(homer.careTeamGoals);
  }
  if (lower === 'api/goals/loadpatientgoals') {
    return json(homer.patientGoals);
  }

  // Letters
  if (lower === 'api/letters/getletterslist') {
    return json(homer.letters);
  }
  if (lower === 'api/letters/getletterdetails') {
    try {
      const body = await request.json();
      const details = homer.letterDetails[body.hnoId];
      if (details) return json(details);
      return json({ bodyHTML: '<p>Letter not found</p>' });
    } catch {
      return json({ bodyHTML: '<p>Letter not found</p>' });
    }
  }

  // Referrals
  if (lower === 'api/referrals/listreferrals') {
    return json(homer.referrals);
  }

  // Documents
  if (lower === 'api/documents/viewer/loadotherdocuments') {
    return json(homer.documents);
  }

  // Education
  if (lower === 'api/education/getpateducationtitles') {
    return json(homer.educationMaterials);
  }

  // Emergency Contacts
  if (lower === 'api/personalinformation/getrelationships') {
    return json(homer.emergencyContacts);
  }

  // Upcoming Orders
  if (lower === 'api/upcoming-orders/getupcomingorders') {
    return json(homer.upcomingOrders);
  }

  // EHI Export
  if (lower === 'api/release-of-information/getehietemplates') {
    return json(homer.ehiExport);
  }

  // Activity Feed
  if (lower === 'api/item-feed/fetchitemfeed') {
    return json(homer.activityFeed);
  }

  // Test Results / Labs
  if (lower === 'api/test-results/getlist') {
    try {
      const body = await request.json();
      // groupType 2 or 3 may return imaging results
      if (body.groupType === 2) {
        return json(homer.imagingLabResultsList);
      }
    } catch { /* fall through */ }
    return json(homer.labResultsList);
  }
  if (lower === 'api/test-results/getdetails') {
    try {
      const body = await request.json();
      if (body.orderKey === 'GRP-XRAY') {
        return json(homer.imagingLabResultDetails);
      }
    } catch { /* fall through */ }
    return json(homer.labResultsDetails);
  }
  if (lower === 'api/past-results/getmultiplehistoricalresultcomponents') {
    return json({ historicalResults: [] });
  }
  if (lower === 'api/report-content/loadreportcontent') {
    try {
      const body = await request.json();
      if (body.reportID === 'RPT-XRAY-001') {
        return json(homer.imagingReportContent);
      }
    } catch { /* fall through */ }
    return json({ reportContent: '' });
  }

  // ── FdiData (bridge from MyChart to eUnity) ───────────────────
  if (lower.startsWith('extensibility/redirection/fdidata')) {
    const url = new URL(request.url);
    const origin = url.origin;
    return json({
      url: `${origin}/e/saml-sts`,
      launchmode: 2,
      IsFdiPost: false,
    });
  }

  // ── Visits ────────────────────────────────────────────────────
  if (lower.startsWith('visits/visitslist/loadupcoming')) {
    return json(homer.upcomingVisits);
  }
  if (lower.startsWith('visits/visitslist/loadpast')) {
    return json(homer.pastVisits);
  }

  // ── Messages / Conversations (mutable state) ──────────────────
  if (lower === 'api/conversations/getconversationlist') {
    return json(conversationsState);
  }
  if (lower === 'api/conversations/getconversationmessages') {
    try {
      const body = await request.json();
      const conv = conversationsState.conversations.find(
        (c: { hthId: string }) => c.hthId === body.conversationId
      );
      if (conv) {
        return json({ messages: conv.messages });
      }
      return json({ messages: [] });
    } catch {
      return json({ messages: [] });
    }
  }
  if (lower === 'api/conversations/getcomposeid') {
    composeIdCounter++;
    return json(`COMPOSE-${composeIdCounter}`);
  }
  if (lower === 'api/conversations/removecomposeid') {
    return json({ success: true });
  }
  if (lower === 'api/conversations/savereplydraft') {
    return json({ success: true });
  }
  if (lower === 'api/conversations/deletedraft') {
    return json({ success: true });
  }
  if (lower === 'api/conversations/deleteconversation') {
    try {
      const body = await request.json();
      conversationsState.conversations = conversationsState.conversations.filter(
        (c: { hthId: string }) => c.hthId !== body.conversationId
      );
      return json({ success: true });
    } catch {
      return json({ success: true });
    }
  }
  if (lower === 'api/conversations/sendreply') {
    try {
      const body = await request.json();
      const conv = conversationsState.conversations.find(
        (c: { hthId: string }) => c.hthId === body.conversationId
      );
      if (conv) {
        conv.messages.push({
          wmgId: `MSG-${Date.now()}`,
          author: { empKey: '', wprKey: 'WPR-HOMER', displayName: 'Homer Simpson' },
          deliveryInstantISO: new Date().toISOString(),
          body: body.messageBody || body.body || '',
        });
      }
      return json({ success: true });
    } catch {
      return json({ success: true });
    }
  }

  // ── Medical Advice Requests (new message compose) ─────────────
  if (lower === 'api/medicaladvicerequests/getsubtopics') {
    return json(homer.subtopics);
  }
  if (lower === 'api/medicaladvicerequests/getmedicaladvicerequestrecipients') {
    return json(homer.messageRecipients);
  }
  if (lower === 'api/medicaladvicerequests/getviewers') {
    return json(homer.messageViewers);
  }
  if (lower === 'api/medicaladvicerequests/sendmedicaladvicerequest') {
    try {
      const body = await request.json();
      const newConvId = `CONV-${Date.now()}`;
      conversationsState.conversations.unshift({
        hthId: newConvId,
        subject: body.subject || 'New Message',
        previewText: body.messageBody || '',
        audience: [{ name: body.recipientName || 'Provider' }],
        hasMoreMessages: false,
        userOverrideNames: {},
        messages: [
          {
            wmgId: `MSG-${Date.now()}`,
            author: { empKey: '', wprKey: 'WPR-HOMER', displayName: 'Homer Simpson' },
            deliveryInstantISO: new Date().toISOString(),
            body: body.messageBody || '',
          },
        ],
      });
      return json(newConvId);
    } catch {
      return json(`CONV-${Date.now()}`);
    }
  }
  if (lower === 'api/medicaladvicerequests/savemedicaladvicerequestdraft') {
    return json({ success: true });
  }

  // ── TOTP / 2FA Setup ──────────────────────────────────────────
  if (lower === 'api/secondary-validation/gettwofactorinfo') {
    return json(homer.totpInfo);
  }
  if (lower === 'api/secondary-validation/verifypasswordandupdatecontact') {
    return json({ IsPasswordValid: true });
  }
  if (lower === 'api/secondary-validation/totpqrcode') {
    return json(homer.totpQrCode);
  }
  if (lower === 'api/secondary-validation/verifycode') {
    return json({ Success: true });
  }
  if (lower === 'api/secondary-validation/updatetwofactortotpoptinstatus') {
    return json({ Success: true });
  }

  // ── Contact Information ───────────────────────────────────────
  if (lower.startsWith('personalinformation/getcontactinformation')) {
    return json(homer.contactInfo);
  }

  // ── Linked Accounts ───────────────────────────────────────────
  if (lower.startsWith('community/shared/loadcommunitylinks')) {
    return json(homer.linkedAccounts);
  }

  // ── Questionnaires ────────────────────────────────────────────
  if (lower === 'questionnaire/getquestionnairelist') {
    return json(homer.questionnaires);
  }

  // ── Fallback ──────────────────────────────────────────────────
  console.log(`[fake-mychart] Unhandled POST: /MyChart/${joined}`);
  return json({ error: 'Not implemented', path: joined }, 404);
}
