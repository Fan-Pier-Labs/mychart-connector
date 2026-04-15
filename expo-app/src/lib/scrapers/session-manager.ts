/**
 * Manages MyChart sessions on-device.
 *
 * Handles login, passkey auto-reconnect, session keepalive,
 * and exposes a tool executor for the AI client.
 *
 * On iOS, passes raw `fetch` to scrapers so iOS handles cookies natively
 * via NSHTTPCookieStorage (no tough-cookie needed).
 */
import { MyChartRequest } from "../../../../scrapers/myChart/myChartRequest";
import {
  myChartUserPassLogin,
  myChartPasskeyLogin,
  complete2faFlow,
  type TwoFaDeliveryInfo,
} from "../../../../scrapers/myChart/login";

// Static imports for all scrapers (Metro doesn't support dynamic import with template literals)
import { getMyChartProfile, getEmail } from "../../../../scrapers/myChart/profile";
import { getHealthSummary } from "../../../../scrapers/myChart/healthSummary";
import { getMedications } from "../../../../scrapers/myChart/medications";
import { getAllergies } from "../../../../scrapers/myChart/allergies";
import { getHealthIssues } from "../../../../scrapers/myChart/healthIssues";
import { upcomingVisits, pastVisits } from "../../../../scrapers/myChart/visits/visits";
import { listLabResults } from "../../../../scrapers/myChart/labs_and_procedure_results/labResults";
import { listConversations } from "../../../../scrapers/myChart/messages/conversations";
import { getBillingHistory } from "../../../../scrapers/myChart/bills/bills";
import { getCareTeam } from "../../../../scrapers/myChart/careTeam";
import { getInsurance } from "../../../../scrapers/myChart/insurance";
import { getImmunizations } from "../../../../scrapers/myChart/immunizations";
import { getPreventiveCare } from "../../../../scrapers/myChart/preventiveCare";
import { getVitals } from "../../../../scrapers/myChart/vitals";
import { getDocuments } from "../../../../scrapers/myChart/documents";
import { getImagingResults } from "../../../../scrapers/myChart/labs_and_procedure_results/labResults";
import { getLetters } from "../../../../scrapers/myChart/letters";
import { getReferrals } from "../../../../scrapers/myChart/referrals";
import { getMedicalHistory } from "../../../../scrapers/myChart/medicalHistory";
import { getEmergencyContacts } from "../../../../scrapers/myChart/emergencyContacts";
import { getActivityFeed } from "../../../../scrapers/myChart/activityFeed";
import { getCareJourneys } from "../../../../scrapers/myChart/careJourneys";
import { getGoals } from "../../../../scrapers/myChart/goals";
import { getEducationMaterials } from "../../../../scrapers/myChart/educationMaterials";
import {
  sendNewMessage,
  getMessageTopics,
  getMessageRecipients,
  getVerificationToken,
  type MessageRecipient,
  type MessageTopic,
} from "../../../../scrapers/myChart/messages/sendMessage";
import { sendReply } from "../../../../scrapers/myChart/messages/sendReply";
import { requestMedicationRefill } from "../../../../scrapers/myChart/medicationRefill";

/**
 * On React Native, use raw fetch — iOS handles cookies natively.
 * This bypasses the tough-cookie layer entirely.
 */
const nativeFetch = (url: string, init: RequestInit) => fetch(url, init);
import {
  getMyChartAccounts,
  updateMyChartAccount,
  type StoredMyChartAccount,
} from "@/lib/storage/secure-store";
import { deserializeCredential } from "../../../../scrapers/myChart/softwareAuthenticator";

type SessionEntry = {
  account: StoredMyChartAccount;
  request: MyChartRequest;
  status: "logged_in" | "need_2fa" | "expired";
};

// In-memory session store
const sessions = new Map<string, SessionEntry>();

// Keepalive interval references
const keepaliveTimers = new Map<string, ReturnType<typeof setInterval>>();

export type ConnectResult = {
  state: "logged_in" | "need_2fa" | "invalid_login" | "error";
  accountId: string;
  twoFaDelivery?: TwoFaDeliveryInfo;
  error?: string;
};

/**
 * Connect a MyChart account. Tries passkey first, falls back to password + 2FA.
 */
export async function connectAccount(account: StoredMyChartAccount): Promise<ConnectResult> {
  // Check if already connected
  const existing = sessions.get(account.id);
  if (existing?.status === "logged_in") {
    return { state: "logged_in", accountId: account.id };
  }

  // Try passkey login first (no 2FA needed)
  if (account.passkeyCredential) {
    try {
      const credential = deserializeCredential(account.passkeyCredential);
      const result = await myChartPasskeyLogin({
        hostname: account.hostname,
        credential,
        fetchFn: nativeFetch,
      });

      if (result.state === "logged_in") {
        sessions.set(account.id, {
          account,
          request: result.mychartRequest,
          status: "logged_in",
        });
        startKeepalive(account.id);
        // Update sign count
        await updateMyChartAccount(account.id, {
          passkeyCredential: JSON.stringify(credential),
        });
        return { state: "logged_in", accountId: account.id };
      }

      console.log(`Passkey login failed for ${account.hostname}: ${result.state}`);
    } catch (err) {
      console.log(`Passkey login error for ${account.hostname}:`, (err as Error).message);
    }
  }

  // Fall back to password login
  try {
    const hasTotpSecret = !!account.totpSecret;
    console.log(`[session] Attempting password login for ${account.hostname} (user=${account.username})`);
    const result = await myChartUserPassLogin({
      hostname: account.hostname,
      user: account.username,
      pass: account.password,
      skipSendCode: hasTotpSecret,
      fetchFn: nativeFetch,
    });
    console.log(`[session] Login result: state=${result.state} error=${result.error || 'none'}`);

    if (result.state === "invalid_login") {
      return { state: "invalid_login", accountId: account.id, error: "Invalid credentials" };
    }

    if (result.state === "error") {
      return { state: "error", accountId: account.id, error: result.error };
    }

    if (result.state === "need_2fa") {
      // If we have a TOTP secret, auto-complete 2FA
      if (account.totpSecret) {
        const { TOTP } = await import("totp-generator");
        const cleanSecret = account.totpSecret.replace(/\s+/g, "").toUpperCase();
        const { otp } = await TOTP.generate(cleanSecret);

        const twoFaResult = await complete2faFlow({
          mychartRequest: result.mychartRequest,
          code: otp,
          isTOTP: true,
        });

        if (twoFaResult.state === "logged_in") {
          sessions.set(account.id, {
            account,
            request: twoFaResult.mychartRequest,
            status: "logged_in",
          });
          startKeepalive(account.id);
          return { state: "logged_in", accountId: account.id };
        }

        return { state: "error", accountId: account.id, error: "TOTP 2FA failed" };
      }

      // No TOTP — need user to enter code manually
      sessions.set(account.id, {
        account,
        request: result.mychartRequest,
        status: "need_2fa",
      });
      return {
        state: "need_2fa",
        accountId: account.id,
        twoFaDelivery: result.twoFaDelivery,
      };
    }

    // Logged in directly (no 2FA)
    sessions.set(account.id, {
      account,
      request: result.mychartRequest,
      status: "logged_in",
    });
    startKeepalive(account.id);
    return { state: "logged_in", accountId: account.id };
  } catch (err) {
    return { state: "error", accountId: account.id, error: (err as Error).message };
  }
}

/**
 * Complete 2FA for an account that's in need_2fa state.
 */
export async function complete2fa(
  accountId: string,
  code: string,
): Promise<{ state: "logged_in" | "invalid_2fa" | "error" }> {
  const entry = sessions.get(accountId);
  if (!entry || entry.status !== "need_2fa") {
    return { state: "error" };
  }

  const result = await complete2faFlow({
    mychartRequest: entry.request,
    code,
  });

  if (result.state === "logged_in") {
    entry.status = "logged_in";
    entry.request = result.mychartRequest;
    startKeepalive(accountId);
    return { state: "logged_in" };
  }

  return { state: result.state };
}

/**
 * Disconnect an account and clear its session.
 */
export function disconnectAccount(accountId: string) {
  sessions.delete(accountId);
  const timer = keepaliveTimers.get(accountId);
  if (timer) {
    clearInterval(timer);
    keepaliveTimers.delete(accountId);
  }
}

/**
 * Connect all configured accounts.
 */
export async function connectAll(): Promise<ConnectResult[]> {
  const accounts = await getMyChartAccounts();
  const results: ConnectResult[] = [];
  for (const account of accounts) {
    if (!sessions.has(account.id) || sessions.get(account.id)?.status !== "logged_in") {
      results.push(await connectAccount(account));
    } else {
      results.push({ state: "logged_in", accountId: account.id });
    }
  }
  return results;
}

/**
 * Get a logged-in session for a hostname (or the first available one).
 */
export function getSession(hostname?: string): SessionEntry | null {
  if (hostname) {
    for (const entry of sessions.values()) {
      if (entry.account.hostname === hostname && entry.status === "logged_in") {
        return entry;
      }
    }
    return null;
  }

  // Return first logged-in session
  for (const entry of sessions.values()) {
    if (entry.status === "logged_in") return entry;
  }
  return null;
}

/**
 * Get all sessions with their status.
 */
export function getAllSessions(): Array<{ accountId: string; hostname: string; status: string }> {
  const result: Array<{ accountId: string; hostname: string; status: string }> = [];
  for (const [id, entry] of sessions) {
    result.push({ accountId: id, hostname: entry.account.hostname, status: entry.status });
  }
  return result;
}

/**
 * Start keepalive pings for a session (every 30 seconds).
 */
function startKeepalive(accountId: string) {
  // Clear existing timer
  const existing = keepaliveTimers.get(accountId);
  if (existing) clearInterval(existing);

  const timer = setInterval(async () => {
    const entry = sessions.get(accountId);
    if (!entry || entry.status !== "logged_in") {
      clearInterval(timer);
      keepaliveTimers.delete(accountId);
      return;
    }

    try {
      const resp = await entry.request.makeRequest({
        path: "/Home/KeepAlive",
        followRedirects: false,
      });
      const text = await resp.text();
      if (text.trim() === "0" || resp.status === 302) {
        console.log(`Session expired for ${entry.account.hostname}`);
        entry.status = "expired";
        clearInterval(timer);
        keepaliveTimers.delete(accountId);

        // Auto-reconnect with passkey
        connectAccount(entry.account).catch(() => {});
      }
    } catch {
      // Network error — keep trying
    }
  }, 30000);

  keepaliveTimers.set(accountId, timer);
}

/**
 * Execute a scraper tool by name against a connected session.
 * This is called by the AI tool executor.
 */
export async function executeScraperTool(
  toolName: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const hostname = input.instance as string | undefined;
  const session = getSession(hostname);

  if (!session) {
    // Try auto-connecting
    const results = await connectAll();
    const connected = results.find((r) => r.state === "logged_in");
    if (!connected) {
      const needs2fa = results.find((r) => r.state === "need_2fa");
      if (needs2fa) {
        throw new Error(
          `MyChart requires 2FA verification for ${needs2fa.accountId}. Go to Settings to complete the login.`,
        );
      }
      const details = results.map((r) => `${r.accountId}=${r.state}${r.error ? ': ' + r.error : ''}`).join(', ');
      throw new Error(`Failed to connect to MyChart. (${details})`);
    }
    const retrySession = getSession(hostname);
    if (!retrySession) {
      throw new Error("Failed to connect to MyChart.");
    }
    return runScraper(retrySession.request, toolName, input);
  }

  return runScraper(session.request, toolName, input);
}

/**
 * Run a specific scraper against a MyChartRequest.
 * Uses static imports from the main repo's scraper modules.
 */
async function runScraper(
  request: MyChartRequest,
  toolName: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  switch (toolName) {
    case "get_profile": {
      const profile = await getMyChartProfile(request);
      const email = await getEmail(request);
      return { ...profile, email };
    }
    case "get_health_summary":
      return getHealthSummary(request);
    case "get_medications":
      return getMedications(request);
    case "get_allergies":
      return getAllergies(request);
    case "get_health_issues":
      return getHealthIssues(request);
    case "get_upcoming_visits":
      return upcomingVisits(request);
    case "get_past_visits": {
      const oldest = new Date();
      oldest.setFullYear(oldest.getFullYear() - ((input.years_back as number) ?? 2));
      return pastVisits(request, oldest);
    }
    case "get_lab_results":
      return listLabResults(request);
    case "get_messages":
      return listConversations(request);
    case "get_billing":
      return getBillingHistory(request);
    case "get_care_team":
      return getCareTeam(request);
    case "get_insurance":
      return getInsurance(request);
    case "get_immunizations":
      return getImmunizations(request);
    case "get_preventive_care":
      return getPreventiveCare(request);
    case "get_vitals":
      return getVitals(request);
    case "get_documents":
      return getDocuments(request);
    case "get_imaging_results":
      return getImagingResults(request);
    case "get_letters":
      return getLetters(request);
    case "get_referrals":
      return getReferrals(request);
    case "get_medical_history":
      return getMedicalHistory(request);
    case "get_emergency_contacts":
      return getEmergencyContacts(request);
    case "get_activity_feed":
      return getActivityFeed(request);
    case "get_care_journeys":
      return getCareJourneys(request);
    case "get_goals":
      return getGoals(request);
    case "get_education_materials":
      return getEducationMaterials(request);
    case "get_message_recipients": {
      const token = await getVerificationToken(request);
      if (!token) throw new Error("Could not get verification token");
      const [recipients, topics] = await Promise.all([
        getMessageRecipients(request, token),
        getMessageTopics(request, token),
      ]);
      return { recipients, topics };
    }
    case "send_message": {
      const token = await getVerificationToken(request);
      if (!token) throw new Error("Could not get verification token");
      const [recipients, topics] = await Promise.all([
        getMessageRecipients(request, token),
        getMessageTopics(request, token),
      ]);
      const titleWords = new Set(["dr", "dr.", "mr", "mr.", "mrs", "mrs.", "ms", "ms.", "md", "md.", "do", "do.", "np", "pa", "rn"]);
      const tokens = String(input.recipient_name ?? "")
        .toLowerCase()
        .split(/[\s,]+/)
        .filter((t) => t && !titleWords.has(t));
      const matchedRecipients = recipients.filter((r: MessageRecipient) => {
        const name = r.displayName.toLowerCase();
        return tokens.every((t) => name.includes(t));
      });
      if (matchedRecipients.length === 0) {
        return {
          error: `No recipient matching "${input.recipient_name}". Available: ${recipients
            .map((r: MessageRecipient) => r.displayName)
            .join(", ")}`,
        };
      }
      if (matchedRecipients.length > 1) {
        return {
          error: `Multiple recipients match "${input.recipient_name}": ${matchedRecipients
            .map((r: MessageRecipient) => r.displayName)
            .join(", ")}. Please be more specific.`,
        };
      }
      const topicQuery = String(input.topic ?? "").toLowerCase();
      const matchedTopic =
        topics.find((t: MessageTopic) => t.displayName.toLowerCase().includes(topicQuery)) ??
        topics[0];
      if (!matchedTopic) return { error: "No message topics available" };
      return sendNewMessage(request, {
        recipient: matchedRecipients[0],
        topic: matchedTopic,
        subject: String(input.subject ?? ""),
        messageBody: String(input.message_body ?? ""),
      });
    }
    case "send_reply":
      return sendReply(request, {
        conversationId: String(input.conversation_id ?? ""),
        messageBody: String(input.message_body ?? ""),
      });
    case "request_refill": {
      const medsResult = await getMedications(request);
      const meds = medsResult.medications;
      const query = String(input.medication_name ?? "").toLowerCase();
      const matched = meds.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.commonName.toLowerCase().includes(query),
      );
      if (matched.length === 0) {
        return {
          error: `No medication matching "${input.medication_name}". Available: ${meds
            .map((m) => m.name)
            .join(", ")}`,
        };
      }
      if (matched.length > 1) {
        return {
          error: `Multiple medications match: ${matched.map((m) => m.name).join(", ")}. Be more specific.`,
        };
      }
      const med = matched[0];
      if (!med.isRefillable) return { error: `"${med.name}" is not refillable.` };
      if (!med.medicationKey) return { error: `"${med.name}" has no medication key.` };
      const refillResult = await requestMedicationRefill(request, med.medicationKey);
      return { ...refillResult, medication: med.name };
    }
    case "get_xray_image":
      return {
        error:
          "Showing X-ray images on mobile is not wired up yet — the eUnity image download pulls in Node-only dependencies we haven't vendored. Use the web app for now.",
      };
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
