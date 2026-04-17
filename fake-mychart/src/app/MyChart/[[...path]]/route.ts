import { NextRequest, NextResponse } from 'next/server';
import { createSession, validateSession, sessionCookieHeader, hasAcceptedTerms, acceptTerms } from '@/lib/session';
import {
  loginPage, loginPageControllerJs, doLoginSuccess, doLoginNeed2FA, doLoginFailed,
  secondaryValidationPage, homePage, csrfTokenPage, genericTokenPage, get2faMethods,
  termsConditionsPage,
  careTeamPage, insurancePage, preventiveCarePage, billingSummaryPage, billingDetailsPage,
  medicationsPage, allergiesPage, healthIssuesPage, immunizationsPage,
  vitalsPage, medicalHistoryPage, testResultsPage, messagesPage, visitsPage,
  lettersPage, goalsPage, referralsPage, careJourneysPage, documentsPage,
  educationPage, emergencyContactsPage, profilePage, settingsPage,
} from '@/lib/html';
import * as homer from '@/data/homer';

import crypto from 'crypto';

// ─── In-memory mutable state (seeded from homer.ts) ─────────────────
// Deep-clone so mutations don't affect the seed module
// eslint-disable-next-line prefer-const
let conversationsState = JSON.parse(JSON.stringify(homer.conversations));
let emergencyContactsState = JSON.parse(JSON.stringify(homer.emergencyContacts));
let ecIdCounter = 100;
let composeIdCounter = 1000;

// TOTP state (mutable — tracks whether TOTP is enabled)
let isTotpEnabled = false;

// Passkey state
let passkeyIdCounter = 0;
let passkeysState: Array<{
  rawId: string;
  name: string;
  createdOnDevice: string;
  creationInstant: string;
  lastUsedInstant: string | null;
}> = [];

// Booked appointments state
const bookedAppointments: Array<{
  confirmationNumber: string;
  slotId: string;
  provider: string;
  department: string;
  location: string;
  visitType: string;
  date: string;
  time: string;
  reason: string;
}> = [];

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

/**
 * Build the public base URL from forwarded headers, so redirects
 * use the external domain rather than the container's localhost.
 */
function publicBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host') || new URL(request.url).host;
  const proto = request.headers.get('cloudfront-forwarded-proto')
    || request.headers.get('x-forwarded-proto')
    || (host.includes('localhost') || !host.includes('.') ? 'http' : 'https');
  return `${proto}://${host}`;
}

function requireSession(request: NextRequest): NextResponse | null {
  const cookie = request.headers.get('cookie');
  if (!validateSession(cookie)) {
    return NextResponse.redirect(new URL('/MyChart/Authentication/Login', publicBaseUrl(request)), 302);
  }
  return null;
}

function acceptAny(): boolean {
  return process.env.FAKE_MYCHART_ACCEPT_ANY === 'true';
}

function requireTerms(): boolean {
  return process.env.FAKE_MYCHART_REQUIRE_TERMS === 'true';
}

function requireTermsRedirect(request: NextRequest): NextResponse | null {
  if (!requireTerms()) return null;
  const cookie = request.headers.get('cookie');
  if (hasAcceptedTerms(cookie)) return null;
  return NextResponse.redirect(new URL('/MyChart/Authentication/TermsConditions', publicBaseUrl(request)), 302);
}

// ─── Route handler ──────────────────────────────────────────────────
export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  if (!path || path.length === 0) {
    return NextResponse.redirect(new URL('/MyChart/Authentication/Login', publicBaseUrl(request)), 302);
  }
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

  if (lower === 'authentication/termsconditions') {
    return html(termsConditionsPage());
  }

  if (lower === 'inside.asp') {
    const termsRedirect = requireTermsRedirect(request);
    if (termsRedirect) return termsRedirect;
    return html('Welcome to MyChart');
  }

  // ── Session / Home ─────────────────────────────────────────────
  if (lower === 'home') {
    const cookie = request.headers.get('cookie');
    if (!validateSession(cookie)) {
      return NextResponse.redirect(new URL('/MyChart/Authentication/Login', publicBaseUrl(request)), 302);
    }
    const termsRedirect = requireTermsRedirect(request);
    if (termsRedirect) return termsRedirect;
    return html(homePage(homer.profile.name, homer.profile.dob, homer.profile.mrn, homer.profile.pcp));
  }

  if (lower.startsWith('home/csrftoken')) {
    const termsRedirect = requireTermsRedirect(request);
    if (termsRedirect) return termsRedirect;
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

  if (lower.startsWith('billing/details/loadpaymentlist')) {
    return json(homer.billingPayments);
  }

  if (lower.startsWith('billing/details/downloadfromblob')) {
    // Return a minimal fake PDF
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A]); // %PDF-1.4\n
    return new NextResponse(pdfBytes, { headers: { 'Content-Type': 'application/pdf' } });
  }

  // ── Rich UI pages ────────────────────────────────────────────────
  if (lower === 'clinical/medications') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(medicationsPage());
  }

  if (lower === 'clinical/allergies') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(allergiesPage());
  }

  if (lower === 'clinical/healthissues') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(healthIssuesPage());
  }

  if (lower === 'clinical/immunizations') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(immunizationsPage());
  }

  if (lower === 'trackmyhealth') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(vitalsPage());
  }

  if (lower === 'medicalhistory') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(medicalHistoryPage());
  }

  if (lower === 'testresults') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(testResultsPage());
  }

  if (lower === 'messaging') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(messagesPage());
  }

  if (lower === 'visits') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(visitsPage());
  }

  if (lower === 'letters') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(lettersPage());
  }

  if (lower === 'goals') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(goalsPage());
  }

  if (lower === 'referrals') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(referralsPage());
  }

  if (lower === 'carejourneys') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(careJourneysPage());
  }

  if (lower === 'documents') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(documentsPage());
  }

  if (lower === 'education') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(educationPage());
  }

  if (lower === 'emergencycontacts') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(emergencyContactsPage());
  }

  if (lower === 'personalinformation') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(profilePage());
  }

  if (lower === 'settings') {
    const redirect = requireSession(request);
    if (redirect) return redirect;
    return html(settingsPage(isTotpEnabled, passkeysState));
  }

  // ── Generic token pages (for scrapers that GET a page to extract CSRF) ──
  if (lower === 'questionnaire' || lower === 'community/manage' || lower.startsWith('app/')) {
    return html(genericTokenPage('MyChart'));
  }

  // Fallback: return a token page for any unknown GET
  return html(genericTokenPage('MyChart'));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  if (!path || path.length === 0) {
    return json({ error: 'Not found' }, 404);
  }
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

      // Handle passkey login (Type: "PasskeyLogin")
      if (loginInfo.Type === 'PasskeyLogin') {
        const creds = loginInfo.Credentials;
        // Validate the passkey exists in our state
        const matchedPasskey = passkeysState.find(pk => pk.rawId === creds.rawId);
        if (matchedPasskey || acceptAny()) {
          if (matchedPasskey) {
            matchedPasskey.lastUsedInstant = new Date().toISOString();
          }
          const sessionId = createSession();
          const response = requireTerms()
            ? html(termsConditionsPage())
            : html(doLoginSuccess());
          response.headers.set('Set-Cookie', sessionCookieHeader(sessionId));
          return response;
        }
        return html(doLoginFailed());
      }

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

      // Check if 2FA is required (opt-in via env var, off by default)
      const require2fa = process.env.FAKE_MYCHART_REQUIRE_2FA === 'true';
      if (require2fa) {
        // Return 2FA page — don't create session yet
        const sessionId = createSession();
        const response = html(doLoginNeed2FA());
        response.headers.set('Set-Cookie', sessionCookieHeader(sessionId));
        return response;
      }

      // Successful login without 2FA — create session and set cookie
      const sessionId = createSession();
      // If terms are required, return the T&C page instead of the home page
      const response = requireTerms()
        ? html(termsConditionsPage())
        : html(doLoginSuccess());
      response.headers.set('Set-Cookie', sessionCookieHeader(sessionId));
      return response;

    } catch {
      return html(doLoginFailed());
    }
  }

  // ── Terms & Conditions acceptance ──────────────────────────────
  if (lower === 'authentication/termsconditions') {
    const cookie = request.headers.get('cookie');
    acceptTerms(cookie);
    // Redirect to home after accepting
    return NextResponse.redirect(new URL('/MyChart/Home', publicBaseUrl(request)), 302);
  }

  // ── 2FA ────────────────────────────────────────────────────────
  if (lower.startsWith('authentication/secondaryvalidation/sendcode')) {
    const body = await request.text();
    const isEmail = body.includes('deliveryMethodEmail=true');
    const maskedEmail = 'ho***@springfield.net';
    const maskedPhone = '***-***-7890';
    const contact = isEmail ? maskedEmail : maskedPhone;
    return html(`Code sent to ${contact}`);
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
    return json(emergencyContactsState);
  }
  if (lower === 'api/personalinformation/addrelationship') {
    try {
      const body = await request.json();
      ecIdCounter++;
      const newContact = {
        id: `EC-${ecIdCounter}`,
        name: body.name || '',
        relationshipType: body.relationshipType || '',
        phoneNumber: body.phoneNumber || '',
        isEmergencyContact: body.isEmergencyContact ?? true,
      };
      emergencyContactsState.relationships.push(newContact);
      return json({ success: true, id: newContact.id });
    } catch {
      return json({ error: 'Invalid request' }, 400);
    }
  }
  if (lower === 'api/personalinformation/updaterelationship') {
    try {
      const body = await request.json();
      const idx = emergencyContactsState.relationships.findIndex(
        (r: { id?: string; name?: string }) => r.id === body.id || r.name === body.id
      );
      if (idx === -1) return json({ error: 'Contact not found' }, 404);
      const existing = emergencyContactsState.relationships[idx];
      emergencyContactsState.relationships[idx] = { ...existing, ...body };
      return json({ success: true });
    } catch {
      return json({ error: 'Invalid request' }, 400);
    }
  }
  if (lower === 'api/personalinformation/removerelationship') {
    try {
      const body = await request.json();
      emergencyContactsState.relationships = emergencyContactsState.relationships.filter(
        (r: { id?: string; name?: string }) => r.id !== body.id && r.name !== body.id
      );
      return json({ success: true });
    } catch {
      return json({ error: 'Invalid request' }, 400);
    }
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
      if (body.orderKey === 'GRP-CT') {
        return json(homer.ctLabResultDetails);
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
      if (body.reportID === 'RPT-CT-001') {
        return json(homer.ctReportContent);
      }
    } catch { /* fall through */ }
    return json({ reportContent: '' });
  }

  // ── FdiData (bridge from MyChart to eUnity) ───────────────────
  if (lower.startsWith('extensibility/redirection/fdidata')) {
    const url = new URL(request.url);
    // Prefer x-forwarded-host, then Host; ignore localhost values that
    // sneak in when Next.js runs behind a load balancer. Force https only
    // for real external hostnames (dotted + non-localhost); Docker service
    // names like "fake-mychart:3000" must stay http.
    const forwardedHost = request.headers.get('x-forwarded-host');
    const hostHeader = request.headers.get('host');
    const isLocalHost = (h: string | null) =>
      !!h && /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|$)/.test(h);
    const host =
      forwardedHost ||
      (hostHeader && !isLocalHost(hostHeader) ? hostHeader : null) ||
      url.host;
    const hostName = host.split(':')[0];
    const isExternal = !isLocalHost(host) && hostName.includes('.');
    const proto = isExternal
      ? 'https'
      : (request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', ''));
    const origin = `${proto}://${host}`;
    // Determine which study based on the fdi parameter
    const fdi = url.searchParams.get('fdi') ?? '';
    const studyType = fdi.includes('CT') ? 'ct' : 'xray';
    return json({
      url: `${origin}/e/saml-sts?study=${studyType}`,
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
      const convId = body.conversationId || '';
      const conv = conversationsState.conversations.find(
        (c: { hthId: string }) => c.hthId === convId
      );
      if (conv) {
        const replyBody = Array.isArray(body.messageBody) ? body.messageBody[0] : (body.messageBody || body.body || '');
        conv.messages.push({
          wmgId: `MSG-${Date.now()}`,
          author: { empKey: '', wprKey: 'WPR-HOMER', displayName: 'Homer Simpson' },
          deliveryInstantISO: new Date().toISOString(),
          body: replyBody,
        });
      }
      // Real MyChart returns the conversation ID as a plain JSON string
      return json(convId);
    } catch {
      return json('');
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
      const msgBody = Array.isArray(body.messageBody) ? body.messageBody[0] : (body.messageBody || '');
      const msgSubject = body.messageSubject || body.subject || 'New Message';
      const recipientName = body.recipient?.displayName || body.recipientName || 'Provider';
      conversationsState.conversations.unshift({
        hthId: newConvId,
        subject: msgSubject,
        previewText: msgBody,
        audience: [{ name: recipientName }],
        hasMoreMessages: false,
        userOverrideNames: {},
        messages: [
          {
            wmgId: `MSG-${Date.now()}`,
            author: { empKey: '', wprKey: 'WPR-HOMER', displayName: 'Homer Simpson' },
            deliveryInstantISO: new Date().toISOString(),
            body: msgBody,
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
    return json({ ...homer.totpInfo, IsTotpEnabled: isTotpEnabled });
  }
  if (lower === 'api/secondary-validation/verifypasswordandupdatecontact') {
    try {
      const body = await request.json();
      const password = body.Password || body.password || '';
      const valid = acceptAny() || password === homer.DEFAULT_PASSWORD;
      return json({ IsPasswordValid: valid });
    } catch {
      return json({ IsPasswordValid: true });
    }
  }
  if (lower === 'api/secondary-validation/totpqrcode') {
    return json(homer.totpQrCode);
  }
  if (lower === 'api/secondary-validation/verifycode') {
    try {
      const body = await request.json();
      const code = body.Code || body.code || '';
      // Accept any 6-digit code, or the fixed test code
      if (acceptAny() || code === '123456' || /^\d{6}$/.test(code)) {
        return json({ Success: true });
      }
      return json({ Success: false });
    } catch {
      return json({ Success: true });
    }
  }
  if (lower === 'api/secondary-validation/updatetwofactortotpoptinstatus') {
    // Toggle TOTP status
    isTotpEnabled = !isTotpEnabled;
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

  // ── Passkey Login Challenge ───────────────────────────────────
  if (lower.startsWith('authentication/login/getpasskeygetparams')) {
    const challenge = crypto.randomBytes(32).toString('base64');
    return json({
      Success: true,
      PasskeyGetParams: {
        Attestation: 'none',
        Challenge: challenge,
        RpId: '',
        Timeout: 60000,
        UserVerification: 'preferred',
        ExpirationInstantIso: `/Date(${Date.now() + 60000})/`,
        AllowCredentials: passkeysState.map(pk => ({ id: pk.rawId, type: 'public-key' })),
      },
    });
  }

  // ── Passkey Management ────────────────────────────────────────
  if (lower === 'api/passkey-management/loadpasskeyinfo') {
    return json({
      passkeys: passkeysState,
      lastAuthentication: undefined,
    });
  }
  if (lower === 'api/passkey-management/generatecreaterequest') {
    const challenge = crypto.randomBytes(32).toString('base64');
    return json({
      success: true,
      data: {
        ...homer.passkeyCreationOptions,
        challenge,
        excludeCredentials: passkeysState.map(pk => ({ id: pk.rawId, type: 'public-key' })),
      },
    });
  }
  if (lower === 'api/passkey-management/createpasskey') {
    try {
      const body = await request.json();
      passkeyIdCounter++;
      const newPasskey = {
        rawId: body.rawId || crypto.randomBytes(32).toString('base64'),
        name: `Passkey ${passkeyIdCounter}`,
        createdOnDevice: 'Software Authenticator',
        creationInstant: new Date().toISOString(),
        lastUsedInstant: null,
      };
      passkeysState.push(newPasskey);
      return json({ success: true, data: newPasskey });
    } catch {
      return json({ success: false, errors: ['Invalid request'] }, 400);
    }
  }
  if (lower === 'api/passkey-management/deletepasskey') {
    try {
      const body = await request.json();
      passkeysState = passkeysState.filter(pk => pk.rawId !== body.rawId);
      return json({ success: true });
    } catch {
      return json({ success: false }, 400);
    }
  }
  if (lower === 'api/passkey-management/renamepasskey') {
    try {
      const body = await request.json();
      const pk = passkeysState.find(p => p.rawId === body.rawId);
      if (pk) pk.name = body.name || pk.name;
      return json({ success: true });
    } catch {
      return json({ success: false }, 400);
    }
  }

  // ── Appointment Booking ───────────────────────────────────────
  if (lower === 'api/scheduling/getavailableappointments') {
    return json({ appointments: homer.availableAppointments });
  }
  if (lower === 'api/scheduling/bookappointment') {
    try {
      const body = await request.json();
      const slotId = body.slotId;
      // Find the slot across all providers
      let foundSlot: { date: string; time: string; slotId: string } | null = null;
      let foundProvider: typeof homer.availableAppointments[0] | null = null;
      for (const appt of homer.availableAppointments) {
        const slot = appt.slots.find(s => s.slotId === slotId);
        if (slot) { foundSlot = slot; foundProvider = appt; break; }
      }
      if (!foundSlot || !foundProvider) {
        return json({ success: false, error: 'Slot not found' }, 400);
      }
      const confirmation = {
        confirmationNumber: `SPRFLD-${Date.now().toString(36).toUpperCase()}`,
        slotId,
        provider: foundProvider.provider,
        department: foundProvider.department,
        location: foundProvider.location,
        visitType: foundProvider.visitType,
        date: foundSlot.date,
        time: foundSlot.time,
        reason: body.reason || 'Not specified',
      };
      bookedAppointments.push(confirmation);
      return json({
        success: true,
        ...confirmation,
        message: `Your appointment with ${foundProvider.provider} on ${foundSlot.date} at ${foundSlot.time} has been confirmed.`,
      });
    } catch {
      return json({ success: false, error: 'Invalid request' }, 400);
    }
  }

  // ── Fallback ──────────────────────────────────────────────────
  console.log(`[fake-mychart] Unhandled POST: /MyChart/${joined}`);
  return json({ error: 'Not implemented', path: joined }, 404);
}
