import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { myChartUserPassLogin, complete2faFlow, areCookiesValid } from '../scrapers/myChart/login';
import { getMyChartProfile, getEmail } from '../scrapers/myChart/profile';
import { getBillingHistory } from '../scrapers/myChart/bills/bills';
import { upcomingVisits, pastVisits } from '../scrapers/myChart/visits/visits';
import { listLabResults } from '../scrapers/myChart/labs_and_procedure_results/labResults';
import { listConversations } from '../scrapers/myChart/messages/conversations';
import { getMedications } from '../scrapers/myChart/medications';
import { getAllergies } from '../scrapers/myChart/allergies';
import { getHealthIssues } from '../scrapers/myChart/healthIssues';
import { getImmunizations } from '../scrapers/myChart/immunizations';
import { getHealthSummary } from '../scrapers/myChart/healthSummary';
import { getCareTeam } from '../scrapers/myChart/careTeam';
import { getPreventiveCare } from '../scrapers/myChart/preventiveCare';
import { getInsurance } from '../scrapers/myChart/insurance';
import { getReferrals } from '../scrapers/myChart/referrals';
import { getMedicalHistory } from '../scrapers/myChart/medicalHistory';
import { getLetters } from '../scrapers/myChart/letters';
import { MyChartRequest } from '../scrapers/myChart/myChartRequest';
import { dte2date } from '../scrapers/myChart/bills/utils';
import { getMyChartAccounts } from '../read-local-passwords/index';
import { PasswordStoreEntryWithKey } from '../read-local-passwords/types';
import { get2FaCodeFromResend } from './resend/resend';
import { sendNewMessage, getMessageTopics, getMessageRecipients, getVerificationToken } from '../scrapers/myChart/messages/sendMessage';
import { sendReply } from '../scrapers/myChart/messages/sendReply';
import { getVitals } from '../scrapers/myChart/vitals';
import { getEmergencyContacts } from '../scrapers/myChart/emergencyContacts';
import { getDocuments } from '../scrapers/myChart/documents';
import { getGoals } from '../scrapers/myChart/goals';
import { getUpcomingOrders } from '../scrapers/myChart/upcomingOrders';
import { getQuestionnaires } from '../scrapers/myChart/questionnaires';
import { getCareJourneys } from '../scrapers/myChart/careJourneys';
import { getActivityFeed } from '../scrapers/myChart/activityFeed';
import { getEducationMaterials } from '../scrapers/myChart/educationMaterials';
import { getEhiExportTemplates } from '../scrapers/myChart/ehiExport';
import { getLinkedMyChartAccounts } from '../scrapers/myChart/other_mycharts/other_mycharts';
import { getConversationMessages } from '../scrapers/myChart/messages/messageThreads';
import { getImagingResults } from '../scrapers/myChart/labs_and_procedure_results/labResults';
import { downloadImagingStudyDirect } from '../scrapers/myChart/eunity/imagingDirectDownload';
import { convertCloToJpg } from '../scrapers/myChart/clo-to-jpg-converter/clo_to_jpg';
import { deleteMessage } from '../scrapers/myChart/messages/deleteMessage';
import { requestMedicationRefill } from '../scrapers/myChart/medicationRefill';
import { sessionStore } from '../scrapers/myChart/sessionStore';
import { generateTotpCode } from '../scrapers/myChart/totp';
import { setupTotp, disableTotp } from '../scrapers/myChart/setupTotp';
import { saveTotpSecret, loadTotpSecret } from './totpStore';
import { myChartPasskeyLogin } from '../scrapers/myChart/login';
import { setupPasskey } from '../scrapers/myChart/setupPasskey';
import { savePasskeyCredential, loadPasskeyCredential } from './passkeyStore';
import { sendTelemetryEvent } from '../shared/telemetry';
import { checkForUpdate } from '../shared/updateCheck';
import { isBlockedInstance } from '../shared/blockedInstances';

// Note: We NEVER modify or delete macOS Keychain entries. Read-only via browser password extraction.

// ─── Cookie cache helpers ───
const COOKIE_CACHE_DIR = path.join(__dirname, '..', '.cookie-cache');

async function tryLoadCachedSession(hostname: string): Promise<MyChartRequest | null> {
  const cachePath = path.join(COOKIE_CACHE_DIR, `${hostname}.json`);
  try {
    const data = await fs.promises.readFile(cachePath, 'utf-8');
    const mychartRequest = await MyChartRequest.unserialize(data);
    if (!mychartRequest) return null;
    const valid = await areCookiesValid(mychartRequest);
    if (valid) return mychartRequest;
    console.log('  Cached cookies expired, will do fresh login.');
    return null;
  } catch {
    return null;
  }
}

async function saveCachedSession(hostname: string, mychartRequest: MyChartRequest): Promise<void> {
  await fs.promises.mkdir(COOKIE_CACHE_DIR, { recursive: true });
  const cachePath = path.join(COOKIE_CACHE_DIR, `${hostname}.json`);
  await fs.promises.writeFile(cachePath, await mychartRequest.serialize());
}

// ─── Parse CLI args ───
// Usage:
//   npx tsx src/cli.ts --host <hostname>                        (finds creds from browser passwords)
//   npx tsx src/cli.ts --host <hostname> --user <u> --pass <p>  (uses provided creds)
//   npx tsx src/cli.ts --host <hostname> --2fa <code>           (provides 2FA code)
//   npx tsx src/cli.ts --host <hostname> --no-cache             (skip cached cookies)
//   npx tsx src/cli.ts --read-login-from-browser --host <hostname>  (read creds from browser password stores)
//   npx tsx src/cli.ts --read-login-from-browser               (auto-pick first MyChart account from browsers)
//   npx tsx src/cli.ts --host <hostname> --action send-message  (send a new message)
//   npx tsx src/cli.ts --host <hostname> --action send-reply --conversation-id <id> --message <msg>

function parseArgs(): { host?: string; user?: string; pass?: string; twofa?: string; nocache?: boolean; readLoginFromBrowser?: boolean; action?: string; conversationId?: string; message?: string; subject?: string; setupTotp?: boolean; useSavedTotp?: boolean; disableTotp?: boolean } {
  const args = process.argv.slice(2);
  const parsed: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--host' && args[i + 1]) parsed.host = args[++i];
    else if (args[i] === '--user' && args[i + 1]) parsed.user = args[++i];
    else if (args[i] === '--pass' && args[i + 1]) parsed.pass = args[++i];
    else if (args[i] === '--2fa' && args[i + 1]) parsed.twofa = args[++i];
    else if (args[i] === '--no-cache') parsed.nocache = true;
    else if (args[i] === '--read-login-from-browser') parsed.readLoginFromBrowser = true;
    else if (args[i] === '--action' && args[i + 1]) parsed.action = args[++i];
    else if (args[i] === '--conversation-id' && args[i + 1]) parsed.conversationId = args[++i];
    else if (args[i] === '--message' && args[i + 1]) parsed.message = args[++i];
    else if (args[i] === '--subject' && args[i + 1]) parsed.subject = args[++i];
    else if (args[i] === '--set-up-totp') parsed.setupTotp = true;
    else if (args[i] === '--use-saved-totp') parsed.useSavedTotp = true;
    else if (args[i] === '--disable-totp') parsed.disableTotp = true;
    else if (args[i] === '--set-up-passkey') parsed.setupPasskey = true;
    else if (args[i] === '--use-passkey') parsed.usePasskey = true;
    else if (args[i] === '--local') parsed.local = true;
  }
  return parsed as { host?: string; user?: string; pass?: string; twofa?: string; nocache?: boolean; readLoginFromBrowser?: boolean; action?: string; conversationId?: string; message?: string; subject?: string; setupTotp?: boolean; useSavedTotp?: boolean; disableTotp?: boolean; setupPasskey?: boolean; usePasskey?: boolean; local?: boolean };
}

const cliArgs = parseArgs();

// If --host provided, try to find creds from browser password stores (read-only)
async function resolveCredsFromBrowsers(host: string): Promise<{ user: string; pass: string } | null> {
  console.log(`  Scanning browser passwords for ${host}...`);
  try {
    const accounts = await getMyChartAccounts();
    const match = accounts.find(a => {
      try {
        return new URL(a.url).hostname === host;
      } catch { return false; }
    });
    if (match && match.user && match.pass) {
      console.log(`  Found credentials for ${host} in browser passwords (user: ${match.user})`);
      return { user: match.user, pass: match.pass };
    }
  } catch (err) {
    console.log(`  Could not scan browser passwords: ${(err as Error).message}`);
  }

  return null;
}

let nonInteractive = false;

let rl: readline.Interface;

function getRL(): readline.Interface {
  if (!rl) {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  }
  return rl;
}

function closeRL() {
  if (rl) rl.close();
}

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    getRL().question(question, (answer) => resolve(answer.trim()));
  });
}

function header(title: string) {
  const line = '='.repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(line);
}

function subheader(title: string) {
  console.log(`\n  -- ${title} --`);
}

function item(label: string, value: string | number | null | undefined) {
  if (value !== null && value !== undefined && value !== '') {
    console.log(`    ${label}: ${value}`);
  }
}

// ─── Step 1: Discover or manually enter credentials ───

async function discoverAccounts(): Promise<PasswordStoreEntryWithKey[]> {
  header('Discovering MyChart Accounts');
  console.log('  Scanning your browsers for saved MyChart passwords...');
  console.log('  (Chrome, Arc, Firefox)\n');

  try {
    const accounts = await getMyChartAccounts();
    if (accounts.length === 0) {
      console.log('  No MyChart accounts found in your browsers.');
    } else {
      console.log(`  Found ${accounts.length} MyChart account(s):\n`);
      for (let i = 0; i < accounts.length; i++) {
        const a = accounts[i];
        const hostname = new URL(a.url).hostname;
        console.log(`    [${i + 1}] ${hostname} - ${a.user || '(no username)'}`);
      }
    }
    return accounts;
  } catch (err) {
    console.log('  Could not scan browsers:', (err as Error).message);
    console.log('  You can still enter credentials manually.\n');
    return [];
  }
}

async function getCredentials(): Promise<{ hostname: string; username: string; password: string }[]> {
  const choice = await ask('\n  How would you like to proceed?\n    [1] Scan browsers for saved MyChart passwords (Recommended)\n    [2] Enter credentials manually\n  Choice (1 or 2): ');

  if (choice === '1') {
    const accounts = await discoverAccounts();

    if (accounts.length === 0) {
      console.log('\n  No accounts found. Falling back to manual entry.\n');
      return [await getManualCredentials()];
    }

    const selection = await ask(`\n  Which accounts to scrape?\n    [a] All of them\n    [#] Enter number (e.g. "1" or "1,3")\n    [m] Enter credentials manually instead\n  Choice: `);

    if (selection.toLowerCase() === 'm') {
      return [await getManualCredentials()];
    }

    let selectedAccounts: PasswordStoreEntryWithKey[];

    if (selection.toLowerCase() === 'a') {
      selectedAccounts = accounts;
    } else {
      const indices = selection.split(',').map(s => parseInt(s.trim()) - 1).filter(i => i >= 0 && i < accounts.length);
      if (indices.length === 0) {
        console.log('  Invalid selection. Using all accounts.');
        selectedAccounts = accounts;
      } else {
        selectedAccounts = indices.map(i => accounts[i]);
      }
    }

    return selectedAccounts.map(a => {
      const hostname = new URL(a.url).hostname;
      return {
        hostname,
        username: a.user || '',
        password: a.pass || '',
      };
    });
  }

  return [await getManualCredentials()];
}

async function getManualCredentials(): Promise<{ hostname: string; username: string; password: string }> {
  console.log('\n  Example hostnames:');
  console.log('    - mychart.example.org');
  console.log('    - mychart.ochsner.org');
  console.log('    - mychart.geisinger.org\n');

  const hostname = await ask('  MyChart hostname: ');
  const username = await ask('  Username: ');
  const password = await ask('  Password: ');

  if (!hostname || !username || !password) {
    console.log('\n  All fields are required. Exiting.');
    rl.close();
    process.exit(1);
  }

  return { hostname, username, password };
}

// ─── Step 2: Login ───

async function login(creds: { hostname: string; username: string; password: string }): Promise<MyChartRequest | null> {
  if (isBlockedInstance(creds.hostname)) {
    console.log(`\n  ✗ ${creds.hostname} is not supported. central.mychart.org is a portal aggregator and cannot be scraped directly. Please use the individual hospital MyChart instance instead.`);
    return null;
  }

  console.log(`\n  Connecting to ${creds.hostname}...`);

  // Try cached session first (unless --no-cache)
  if (!cliArgs.nocache) {
    const cached = await tryLoadCachedSession(creds.hostname);
    if (cached) {
      console.log('  Using cached session (skipping login).');
      return cached;
    }
  }

  try {
    // Try passkey login first if --use-passkey or if a saved passkey exists
    const savedPasskey = await loadPasskeyCredential(creds.hostname);
    if (cliArgs.usePasskey || savedPasskey) {
      if (!savedPasskey) {
        console.log(`  No saved passkey found for ${creds.hostname}. Run with --set-up-passkey first.`);
        if (cliArgs.usePasskey) return null; // Only fail if explicitly requested
      } else {
        console.log(`  Attempting passkey login for ${creds.hostname}...`);
        const passkeyResult = await myChartPasskeyLogin({
          hostname: creds.hostname,
          credential: savedPasskey,
          protocol: cliArgs.local ? 'http' : undefined,
        });

        if (passkeyResult.state === 'logged_in') {
          console.log('  Passkey login successful!');
          // Save updated credential (incremented sign counter)
          await savePasskeyCredential(creds.hostname, savedPasskey);
          await saveCachedSession(creds.hostname, passkeyResult.mychartRequest);
          return passkeyResult.mychartRequest;
        }

        console.log(`  Passkey login failed (${passkeyResult.state}). Falling back to password login.`);
      }
    }

    // Check if we should use TOTP for 2FA
    const useTotpSecret = cliArgs.useSavedTotp ? await loadTotpSecret(creds.hostname) : null;
    if (cliArgs.useSavedTotp && !useTotpSecret) {
      console.log(`  No saved TOTP secret found for ${creds.hostname}. Run with --set-up-totp first.`);
      return null;
    }

    // When using TOTP, skip the SendCode call (no email needed)
    const loginResult = await myChartUserPassLogin({
      hostname: creds.hostname,
      user: creds.username,
      pass: creds.password,
      skipSendCode: !!useTotpSecret,
      protocol: cliArgs.local ? 'http' : undefined,
    });

    if (loginResult.state === 'invalid_login') {
      console.log('  Login failed: Invalid username or password.');
      return null;
    }

    if (loginResult.state === 'error') {
      console.log(`  Login error: ${loginResult.error}`);
      return null;
    }

    let mychartRequest = loginResult.mychartRequest;

    if (loginResult.state === 'need_2fa') {
      let twofaCodeArray: { code: string; score: number }[];

      if (useTotpSecret) {
        // Generate TOTP code locally — no email, no waiting
        const totpCode = await generateTotpCode(useTotpSecret);
        console.log(`  Generated TOTP code: ${totpCode}`);
        twofaCodeArray = [{ code: totpCode, score: 1 }];
      } else if (nonInteractive && cliArgs.twofa) {
        console.log('  Using 2FA code from --2fa arg');
        twofaCodeArray = [{ code: cliArgs.twofa, score: 1 }];
      } else {
        // Show where the code was sent
        if (loginResult.twoFaDelivery) {
          const { method, contact } = loginResult.twoFaDelivery;
          if (method === 'sms') {
            console.log(`  2FA code sent via text message${contact ? ` to ${contact}` : ''}`);
          } else {
            console.log(`  2FA code sent via email${contact ? ` to ${contact}` : ''}`);
          }
        }
        console.log('  Waiting for 2FA code via Resend...');
        const resendCodes = await get2FaCodeFromResend(Date.now(), creds.hostname);
        if (resendCodes.length === 0) {
          console.log('  No 2FA code found via Resend after 60s. Skipping this account.');
          return null;
        }
        console.log(`  Found ${resendCodes.length} candidate code(s) via Resend (best: ${resendCodes[0].code}, score: ${resendCodes[0].score})`);
        twofaCodeArray = resendCodes;
      }

      const twoFaResult = await complete2faFlow({
        mychartRequest,
        twofaCodeArray,
        isTOTP: !!useTotpSecret,
      });

      if (twoFaResult.state === 'invalid_2fa') {
        console.log('  Invalid 2FA code.');
        return null;
      }

      if (twoFaResult.state === 'error') {
        console.log('  Error completing 2FA.');
        return null;
      }

      mychartRequest = twoFaResult.mychartRequest;

      // After successful email-based 2FA, offer TOTP auto-setup
      if (!useTotpSecret && !cliArgs.setupTotp) {
        const existingSecret = await loadTotpSecret(creds.hostname);
        if (!existingSecret) {
          console.log('\n  To let the CLI sign in automatically in the future, we can set up');
          console.log('  a TOTP authenticator on your MyChart account (no email codes needed).');
          const setupChoice = await ask('  Set up automatic sign-in? (y/n): ');
          if (setupChoice.trim().toLowerCase() === 'y') {
            console.log('  Setting up TOTP authenticator...');
            const result = await setupTotp(mychartRequest, creds.password);
            if (result.secret) {
              await saveTotpSecret(creds.hostname, result.secret);
              console.log('  TOTP configured! Future logins will use --use-saved-totp automatically.');
            } else {
              console.log(`  TOTP setup failed: ${result.error}`);
              console.log('  Your session is still active but will expire in a few hours.');
              console.log('  Without TOTP, you\'ll need email 2FA again next time.');
            }
          } else {
            console.log('  Skipped TOTP setup. Your session will expire in a few hours.');
            console.log('  Tip: Use --set-up-totp later to enable automatic sign-in.');
          }
        }
      }
    }

    console.log('  Logged in successfully!');
    await saveCachedSession(creds.hostname, mychartRequest);
    return mychartRequest;
  } catch (err) {
    console.error('  Login failed:', (err as Error).message);
    return null;
  }
}

// ─── Step 3: Scrape everything ───

async function scrapeAll(mychartRequest: MyChartRequest, hostname: string) {
  header(`Scraping: ${hostname}`);
  console.log('  This may take a minute...\n');

  // Profile
  subheader('Profile');
  try {
    const profile = await getMyChartProfile(mychartRequest);
    if (profile) {
      item('Name', profile.name);
      item('Date of Birth', profile.dob);
      item('MRN', profile.mrn);
      item('PCP', profile.pcp);
    } else {
      console.log('    Could not retrieve profile data.');
    }
  } catch (err) {
    console.log('    Error fetching profile:', (err as Error).message);
  }

  // Email
  try {
    const email = await getEmail(mychartRequest);
    if (email) {
      item('Email', email);
    }
  } catch (err) {
    console.log('    Error fetching email:', (err as Error).message);
  }

  // Billing
  subheader('Billing History');
  try {
    const billingAccounts = await getBillingHistory(mychartRequest);
    if (billingAccounts.length === 0) {
      console.log('    No billing accounts found.');
    }
    for (const account of billingAccounts) {
      console.log(`\n    Guarantor #${account.guarantorNumber} (${account.patientName})`);
      if (account.amountDue !== undefined) {
        item('Amount Due', `$${account.amountDue.toFixed(2)}`);
      }

      const details = account.billingDetails;
      if (details) {
        const allVisits = details.Data.UnifiedVisitList.concat(details.Data.InformationalVisitList);
        console.log(`    Total billing items: ${allVisits.length}`);

        for (const visit of allVisits.slice(0, 20)) {
          const date = visit.StartDateDisplay || (visit.StartDate ? dte2date(visit.StartDate).toLocaleDateString() : 'N/A');
          const desc = visit.Description || 'No description';
          const provider = visit.Provider || '';
          const charge = visit.ChargeAmount || '';
          const selfDue = visit.SelfAmountDue || '';

          console.log(`\n      ${date} - ${desc}`);
          if (provider) item('  Provider', provider);
          if (charge) item('  Charge', charge);
          if (selfDue) item('  You Owe', selfDue);
          if (visit.PrimaryPayer) item('  Insurance', visit.PrimaryPayer);

          if (visit.ProcedureList && visit.ProcedureList.length > 0) {
            for (const proc of visit.ProcedureList) {
              console.log(`        - ${proc.Description}: ${proc.Amount} (you owe: ${proc.SelfAmountDue})`);
            }
          }
        }

        if (allVisits.length > 20) {
          console.log(`\n    ... and ${allVisits.length - 20} more billing items`);
        }
      }

      // Payment history
      const payments = account.paymentList?.Data?.PaymentList;
      if (payments && payments.length > 0) {
        console.log(`\n    Patient Payments: ${payments.length}`);
        for (const payment of payments) {
          const paymentMethod = payment.HtmlSubText?.replace(/<[^>]+>/g, '').trim() || '';
          console.log(`      ${payment.FormattedDateDisplay} - ${payment.Description} - ${payment.PaymentAmountDisplay} ${paymentMethod}`);
        }
      }
    }
  } catch (err) {
    console.log('    Error fetching billing:', (err as Error).message);
  }

  // Upcoming Visits
  subheader('Upcoming Visits');
  try {
    const upcoming = await upcomingVisits(mychartRequest);
    if (upcoming) {
      const allVisits = [
        ...(upcoming.LaterVisitsList || []),
        ...(upcoming.NextNDaysVisits || []),
        ...(upcoming.InProgressVisits || []),
      ];

      if (allVisits.length === 0) {
        console.log('    No upcoming visits.');
      }

      for (const visit of allVisits) {
        console.log(`\n      ${visit.Date} ${visit.Time} - ${visit.VisitTypeName}`);
        if (visit.PrimaryProviderName) item('  Provider', visit.PrimaryProviderName);
        if (visit.PrimaryDepartment?.Name) item('  Location', visit.PrimaryDepartment.Name);
        if (visit.PrimaryDepartment?.Address?.length) {
          item('  Address', visit.PrimaryDepartment.Address.join(', '));
        }
      }
    }
  } catch (err) {
    console.log('    Error fetching upcoming visits:', (err as Error).message);
  }

  // Past Visits
  subheader('Past Visits (last 2 years)');
  try {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const past = await pastVisits(mychartRequest, twoYearsAgo);
    if (past && past.List) {
      let totalPast = 0;
      for (const [, orgVisits] of Object.entries(past.List)) {
        for (const visit of orgVisits.List.slice(0, 15)) {
          console.log(`\n      ${visit.Date} ${visit.Time || ''} - ${visit.VisitTypeName}`);
          if (visit.PrimaryProviderName) item('  Provider', visit.PrimaryProviderName);
          if (visit.PrimaryDepartment?.Name) item('  Location', visit.PrimaryDepartment.Name);
          if (visit.Diagnoses) item('  Diagnoses', visit.Diagnoses.map(d => d.Description).join(', '));
          totalPast++;
        }
        if (orgVisits.List.length > 15) {
          console.log(`\n    ... and ${orgVisits.List.length - 15} more past visits for this organization`);
        }
        totalPast += Math.max(0, orgVisits.List.length - 15);
      }
      if (totalPast === 0) {
        console.log('    No past visits found.');
      }
    }
  } catch (err) {
    console.log('    Error fetching past visits:', (err as Error).message);
  }

  // Lab Results
  subheader('Lab Results');
  try {
    const labs = await listLabResults(mychartRequest);
    if (labs.length === 0) {
      console.log('    No lab results found.');
    }
    for (const lab of labs.slice(0, 15)) {
      console.log(`\n      ${lab.orderName}`);

      for (const result of lab.results || []) {
        if (result.orderMetadata?.collectionTimestampsDisplay) {
          item('  Collected', result.orderMetadata.collectionTimestampsDisplay);
        } else if (result.orderMetadata?.resultTimestampDisplay) {
          item('  Date', result.orderMetadata.resultTimestampDisplay);
        }
        if (result.orderMetadata?.authorizingProviderName || result.orderMetadata?.orderProviderName) {
          item('  Ordered By', result.orderMetadata.authorizingProviderName || result.orderMetadata.orderProviderName);
        }
        if (result.orderMetadata?.resultStatus) {
          item('  Status', result.orderMetadata.resultStatus);
        }
        if (result.orderMetadata?.specimensDisplay) {
          item('  Specimen', result.orderMetadata.specimensDisplay);
        }
        if (result.orderMetadata?.associatedDiagnoses?.length) {
          item('  Diagnosis', result.orderMetadata.associatedDiagnoses.join(', '));
        }

        if (result.resultComponents && result.resultComponents.length > 0) {
          for (const comp of result.resultComponents) {
            const name = comp.componentInfo?.name || comp.componentInfo?.commonName || 'Unknown';
            const value = comp.componentResultInfo?.value || '';
            const units = comp.componentInfo?.units || '';
            const range = comp.componentResultInfo?.referenceRange?.formattedReferenceRange || '';
            const flag = comp.componentResultInfo?.abnormalFlagCategoryValue;
            const abnormal = (flag && flag !== 'Unknown' && flag !== 0 && flag !== '0') ? ' ⚠ ABNORMAL' : '';

            console.log(`        ${name}: ${value} ${units} ${range ? `(ref: ${range})` : ''}${abnormal}`);

            // Show component comments (e.g., "NEGATIVE" interpretation)
            if (comp.componentComments?.hasContent && comp.componentComments.contentAsString) {
              const comment = comp.componentComments.contentAsString.replace(/\r\n/g, ' ').trim();
              if (comment) {
                console.log(`          → ${comment.substring(0, 150)}`);
              }
            }

            // Show historical trend if available
            const compHistory = lab.historicalResults?.historicalResults?.[comp.componentInfo?.componentID];
            if (compHistory?.historicalResultData && compHistory.historicalResultData.length > 1) {
              const points = compHistory.historicalResultData;
              const trendStr = points
                .slice(0, 5)
                .map(dp => {
                  const date = dp.dateISO ? new Date(dp.dateISO).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '?';
                  return `${date}: ${dp.value}`;
                })
                .join(' → ');
              console.log(`          History (${points.length} values): ${trendStr}${points.length > 5 ? ' ...' : ''}`);
            }
          }
        }

        if (result.resultNote?.hasContent && result.resultNote.contentAsString) {
          console.log(`        Note: ${result.resultNote.contentAsString.substring(0, 200)}`);
        }

        if (result.studyResult?.narrative?.hasContent) {
          console.log(`        Narrative: ${result.studyResult.narrative.contentAsString.substring(0, 200)}...`);
        }
        if (result.studyResult?.impression?.hasContent) {
          console.log(`        Impression: ${result.studyResult.impression.contentAsString.substring(0, 200)}...`);
        }

        if (result.orderMetadata?.resultingLab?.name) {
          console.log(`        Lab: ${result.orderMetadata.resultingLab.name}`);
        }
      }
    }
    if (labs.length > 15) {
      console.log(`\n    ... and ${labs.length - 15} more lab results`);
    }
  } catch (err) {
    console.log('    Error fetching lab results:', (err as Error).message);
  }

  // Messages
  subheader('Messages');
  try {
    const conversations = await listConversations(mychartRequest);
    if (conversations && conversations.threads && conversations.threads.length > 0) {
      for (const thread of conversations.threads.slice(0, 10)) {
        console.log(`\n      Subject: ${thread.subject || 'No subject'}`);
        if (thread.senderName) item('  From', thread.senderName);
        if (thread.lastMessageDateDisplay) item('  Date', thread.lastMessageDateDisplay);
        if (thread.preview) item('  Preview', thread.preview.substring(0, 100));
      }
      if (conversations.threads.length > 10) {
        console.log(`\n    ... and ${conversations.threads.length - 10} more messages`);
      }
    } else {
      console.log('    No messages found (or different response format).');
      if (conversations && typeof conversations === 'object') {
        const keys = Object.keys(conversations);
        if (keys.length > 0) {
          console.log(`    Response keys: ${keys.join(', ')}`);
          for (const key of keys) {
            if (Array.isArray(conversations[key])) {
              console.log(`    ${key}: ${conversations[key].length} items`);
            }
          }
        }
      }
    }
  } catch (err) {
    console.log('    Error fetching messages:', (err as Error).message);
  }

  // Health Summary
  subheader('Health Summary');
  try {
    const summary = await getHealthSummary(mychartRequest);
    item('Age', summary.patientAge);
    if (summary.height) item('Height', `${summary.height.value} (recorded ${summary.height.dateRecorded})`);
    if (summary.weight) item('Weight', `${summary.weight.value} (recorded ${summary.weight.dateRecorded})`);
    if (summary.bloodType) item('Blood Type', summary.bloodType);
    if (summary.lastVisit) item('Last Visit', `${summary.lastVisit.date} - ${summary.lastVisit.visitType}`);
  } catch (err) {
    console.log('    Error fetching health summary:', (err as Error).message);
  }

  // Medications
  subheader('Medications');
  try {
    const medsResult = await getMedications(mychartRequest);
    if (medsResult.medications.length === 0) {
      console.log('    No medications found.');
    }
    for (const med of medsResult.medications) {
      console.log(`\n      ${med.name}${med.commonName ? ` (${med.commonName})` : ''}`);
      item('  Instructions', med.sig);
      item('  Prescribed', med.dateToDisplay);
      item('  Provider', med.authorizingProviderName);
      if (med.pharmacy) item('  Pharmacy', med.pharmacy.name);
      if (med.refillDetails) {
        item('  Quantity', med.refillDetails.writtenDispenseQuantity);
        item('  Day Supply', med.refillDetails.daySupply);
      }
      item('  Refillable', med.isRefillable ? 'Yes' : 'No');
    }
  } catch (err) {
    console.log('    Error fetching medications:', (err as Error).message);
  }

  // Allergies
  subheader('Allergies');
  try {
    const allergiesResult = await getAllergies(mychartRequest);
    if (allergiesResult.allergies.length === 0) {
      console.log('    No known allergies.');
    }
    for (const allergy of allergiesResult.allergies) {
      console.log(`\n      ${allergy.name}`);
      if (allergy.type) item('  Type', allergy.type);
      if (allergy.reaction) item('  Reaction', allergy.reaction);
      if (allergy.severity) item('  Severity', allergy.severity);
      if (allergy.formattedDateNoted) item('  Date Noted', allergy.formattedDateNoted);
    }
  } catch (err) {
    console.log('    Error fetching allergies:', (err as Error).message);
  }

  // Health Issues
  subheader('Health Issues (Diagnoses)');
  try {
    const issues = await getHealthIssues(mychartRequest);
    if (issues.length === 0) {
      console.log('    No health issues on file.');
    }
    for (const issue of issues) {
      console.log(`      ${issue.name} (noted ${issue.formattedDateNoted})`);
    }
  } catch (err) {
    console.log('    Error fetching health issues:', (err as Error).message);
  }

  // Immunizations
  subheader('Immunizations');
  try {
    const immunizations = await getImmunizations(mychartRequest);
    if (immunizations.length === 0) {
      console.log('    No immunizations on file.');
    }
    for (const imm of immunizations) {
      console.log(`\n      ${imm.name}`);
      item('  Dates', imm.administeredDates.join(', '));
      if (imm.organizationName) item('  Organization', imm.organizationName);
    }
  } catch (err) {
    console.log('    Error fetching immunizations:', (err as Error).message);
  }

  // Care Team
  subheader('Care Team');
  try {
    const careTeam = await getCareTeam(mychartRequest);
    if (careTeam.length === 0) {
      console.log('    No care team members found.');
    }
    for (const member of careTeam) {
      console.log(`      ${member.name}`);
      if (member.role) item('  Role', member.role);
      if (member.specialty) item('  Specialty', member.specialty);
    }
  } catch (err) {
    console.log('    Error fetching care team:', (err as Error).message);
  }

  // Preventive Care
  subheader('Preventive Care');
  try {
    const preventive = await getPreventiveCare(mychartRequest);
    if (preventive.length === 0) {
      console.log('    No preventive care items found.');
    }
    for (const pc of preventive) {
      const statusLabel = pc.status === 'overdue' ? 'OVERDUE' : pc.status === 'not_due' ? 'Not Due' : pc.status === 'completed' ? 'Completed' : '';
      console.log(`      [${statusLabel}] ${pc.name}`);
      if (pc.overdueSince) item('  Overdue Since', pc.overdueSince);
      if (pc.notDueUntil) item('  Not Due Until', pc.notDueUntil);
      if (pc.completedDate) item('  Completed', pc.completedDate);
      if (pc.previouslyDone.length > 0) item('  Previously Done', pc.previouslyDone.join(', '));
    }
  } catch (err) {
    console.log('    Error fetching preventive care:', (err as Error).message);
  }

  // Insurance
  subheader('Insurance');
  try {
    const insurance = await getInsurance(mychartRequest);
    if (!insurance.hasCoverages) {
      console.log('    No insurance coverages on file.');
    }
    for (const coverage of insurance.coverages) {
      console.log(`\n      ${coverage.planName}`);
      if (coverage.subscriberName) item('  Subscriber', coverage.subscriberName);
      if (coverage.memberId) item('  Member ID', coverage.memberId);
      if (coverage.groupNumber) item('  Group', coverage.groupNumber);
    }
  } catch (err) {
    console.log('    Error fetching insurance:', (err as Error).message);
  }

  // Referrals
  subheader('Referrals');
  try {
    const referrals = await getReferrals(mychartRequest);
    if (referrals.length === 0) {
      console.log('    No referrals found.');
    }
    for (const ref of referrals) {
      console.log(`\n      Referral #${ref.externalId} to ${ref.referredToFacility || ref.referredToProviderName || 'Unknown'}`);
      item('  Status', ref.statusString);
      item('  Referred By', ref.referredByProviderName);
      item('  Created', ref.creationDate);
      if (ref.startDate || ref.endDate) item('  Valid', `${ref.startDate} - ${ref.endDate}`);
    }
  } catch (err) {
    console.log('    Error fetching referrals:', (err as Error).message);
  }

  // Medical & Family History
  subheader('Medical & Family History');
  try {
    const history = await getMedicalHistory(mychartRequest);

    if (history.medicalHistory.diagnoses.length > 0) {
      console.log('    Medical History:');
      for (const dx of history.medicalHistory.diagnoses) {
        console.log(`      ${dx.diagnosisName}${dx.diagnosisDate ? ` (${dx.diagnosisDate})` : ''}`);
      }
    }

    if (history.surgicalHistory.surgeries.length > 0) {
      console.log('    Surgical History:');
      for (const sx of history.surgicalHistory.surgeries) {
        console.log(`      ${sx.surgeryName}${sx.surgeryDate ? ` (${sx.surgeryDate})` : ''}`);
      }
    }

    if (history.familyHistory.familyMembers.length > 0) {
      console.log('    Family History:');
      for (const fm of history.familyHistory.familyMembers) {
        const conditions = fm.conditions.length > 0 ? fm.conditions.join(', ') : 'None noted';
        console.log(`      ${fm.relationshipToPatientName} (${fm.statusName}): ${conditions}`);
      }
    }
  } catch (err) {
    console.log('    Error fetching medical history:', (err as Error).message);
  }

  // Letters
  subheader('Letters');
  try {
    const letters = await getLetters(mychartRequest);
    if (letters.length === 0) {
      console.log('    No letters found.');
    }
    for (const letter of letters) {
      console.log(`      ${letter.dateISO} - ${letter.reason} (from ${letter.providerName})`);
    }
  } catch (err) {
    console.log('    Error fetching letters:', (err as Error).message);
  }

  // Vitals
  subheader('Vitals / Track My Health');
  try {
    const flowsheets = await getVitals(mychartRequest);
    if (flowsheets.length === 0) {
      console.log('    No vitals data found.');
    }
    for (const fs of flowsheets) {
      console.log(`\n      ${fs.name}`);
      for (const reading of fs.readings.slice(0, 10)) {
        console.log(`        ${reading.date}: ${reading.value} ${reading.units}`);
      }
      if (fs.readings.length > 10) {
        console.log(`        ... and ${fs.readings.length - 10} more readings`);
      }
    }
  } catch (err) {
    console.log('    Error fetching vitals:', (err as Error).message);
  }

  // Emergency Contacts
  subheader('Emergency Contacts');
  try {
    const contacts = await getEmergencyContacts(mychartRequest);
    if (contacts.length === 0) {
      console.log('    No emergency contacts found.');
    }
    for (const contact of contacts) {
      console.log(`      ${contact.name} (${contact.relationshipType})`);
      if (contact.phoneNumber) item('  Phone', contact.phoneNumber);
      item('  Emergency Contact', contact.isEmergencyContact ? 'Yes' : 'No');
    }
  } catch (err) {
    console.log('    Error fetching emergency contacts:', (err as Error).message);
  }

  // Documents
  subheader('Documents');
  try {
    const documents = await getDocuments(mychartRequest);
    if (documents.length === 0) {
      console.log('    No documents found.');
    }
    for (const doc of documents.slice(0, 20)) {
      console.log(`\n      ${doc.date} - ${doc.title}`);
      if (doc.documentType) item('  Type', doc.documentType);
      if (doc.providerName) item('  Provider', doc.providerName);
      if (doc.organizationName) item('  Organization', doc.organizationName);
    }
    if (documents.length > 20) {
      console.log(`\n    ... and ${documents.length - 20} more documents`);
    }
  } catch (err) {
    console.log('    Error fetching documents:', (err as Error).message);
  }

  // Goals
  subheader('Goals');
  try {
    const goals = await getGoals(mychartRequest);
    if (goals.careTeamGoals.length === 0 && goals.patientGoals.length === 0) {
      console.log('    No goals found.');
    }
    if (goals.careTeamGoals.length > 0) {
      console.log('    Care Team Goals:');
      for (const goal of goals.careTeamGoals) {
        console.log(`      ${goal.name} [${goal.status}]`);
        if (goal.description) item('  Description', goal.description);
      }
    }
    if (goals.patientGoals.length > 0) {
      console.log('    Patient Goals:');
      for (const goal of goals.patientGoals) {
        console.log(`      ${goal.name} [${goal.status}]`);
        if (goal.description) item('  Description', goal.description);
      }
    }
  } catch (err) {
    console.log('    Error fetching goals:', (err as Error).message);
  }

  // Upcoming Orders
  subheader('Upcoming Orders');
  try {
    const orders = await getUpcomingOrders(mychartRequest);
    if (orders.length === 0) {
      console.log('    No upcoming orders found.');
    }
    for (const order of orders) {
      console.log(`\n      ${order.orderName} (${order.orderType})`);
      item('  Status', order.status);
      item('  Ordered', order.orderedDate);
      item('  Provider', order.orderedByProvider);
      if (order.facilityName) item('  Facility', order.facilityName);
    }
  } catch (err) {
    console.log('    Error fetching upcoming orders:', (err as Error).message);
  }

  // Questionnaires
  subheader('Questionnaires');
  try {
    const questionnaires = await getQuestionnaires(mychartRequest);
    if (questionnaires.length === 0) {
      console.log('    No questionnaires found.');
    }
    for (const q of questionnaires) {
      console.log(`      ${q.name} [${q.status}]`);
      if (q.dueDate) item('  Due', q.dueDate);
      if (q.completedDate) item('  Completed', q.completedDate);
    }
  } catch (err) {
    console.log('    Error fetching questionnaires:', (err as Error).message);
  }

  // Care Journeys
  subheader('Care Journeys');
  try {
    const journeys = await getCareJourneys(mychartRequest);
    if (journeys.length === 0) {
      console.log('    No care journeys found.');
    }
    for (const journey of journeys) {
      console.log(`      ${journey.name} [${journey.status}]`);
      if (journey.description) item('  Description', journey.description);
      if (journey.providerName) item('  Provider', journey.providerName);
    }
  } catch (err) {
    console.log('    Error fetching care journeys:', (err as Error).message);
  }

  // Activity Feed
  subheader('Activity Feed');
  try {
    const feed = await getActivityFeed(mychartRequest);
    if (feed.length === 0) {
      console.log('    No activity feed items found.');
    }
    for (const feedItem of feed.slice(0, 20)) {
      console.log(`      ${feedItem.date} - ${feedItem.title} [${feedItem.type}]`);
      if (feedItem.description) item('  Description', feedItem.description.substring(0, 150));
    }
    if (feed.length > 20) {
      console.log(`\n    ... and ${feed.length - 20} more activity items`);
    }
  } catch (err) {
    console.log('    Error fetching activity feed:', (err as Error).message);
  }

  // Education Materials
  subheader('Education Materials');
  try {
    const materials = await getEducationMaterials(mychartRequest);
    if (materials.length === 0) {
      console.log('    No education materials found.');
    }
    for (const mat of materials) {
      console.log(`      ${mat.title}`);
      if (mat.category) item('  Category', mat.category);
      if (mat.assignedDate) item('  Assigned', mat.assignedDate);
      if (mat.providerName) item('  Provider', mat.providerName);
    }
  } catch (err) {
    console.log('    Error fetching education materials:', (err as Error).message);
  }

  // EHI Export Templates
  subheader('EHI Export Templates');
  try {
    const templates = await getEhiExportTemplates(mychartRequest);
    if (templates.length === 0) {
      console.log('    No EHI export templates found.');
    }
    for (const tmpl of templates) {
      console.log(`      ${tmpl.name} (${tmpl.format})`);
      if (tmpl.description) item('  Description', tmpl.description);
    }
  } catch (err) {
    console.log('    Error fetching EHI export templates:', (err as Error).message);
  }

  // Linked MyChart Accounts
  subheader('Linked MyChart Accounts');
  try {
    const accounts = await getLinkedMyChartAccounts(mychartRequest);
    if (accounts.length === 0) {
      console.log('    No linked MyChart accounts found.');
    }
    for (const account of accounts) {
      console.log(`\n      ${account.name}`);
      if (account.logoUrl) item('  Logo URL', account.logoUrl);
      if (account.lastEncounter) item('  Last Encounter', account.lastEncounter);
    }
  } catch (err) {
    console.log('    Error fetching linked MyChart accounts:', (err as Error).message);
  }
}

// ─── Send Message Handler ───

async function handleSendMessage(mychartRequest: MyChartRequest) {
  header('Send New Message');

  const token = await getVerificationToken(mychartRequest);
  if (!token) {
    console.log('  Could not get verification token. Session may have expired.');
    return;
  }

  // Get available topics
  const topics = await getMessageTopics(mychartRequest, token);
  if (topics.length === 0) {
    console.log('  No message topics available.');
    return;
  }

  console.log('\n  Available topics:');
  for (let i = 0; i < topics.length; i++) {
    console.log(`    [${i + 1}] ${topics[i].displayName}`);
  }

  const topicChoice = await ask('\n  Select topic number: ');
  const topicIdx = parseInt(topicChoice) - 1;
  if (topicIdx < 0 || topicIdx >= topics.length) {
    console.log('  Invalid topic selection.');
    return;
  }
  const selectedTopic = topics[topicIdx];

  // Get available recipients
  const recipients = await getMessageRecipients(mychartRequest, token);
  if (recipients.length === 0) {
    console.log('  No recipients available.');
    return;
  }

  console.log('\n  Available recipients:');
  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    const specialty = r.specialty ? ` (${r.specialty})` : r.pcpTypeDisplayName ? ` (${r.pcpTypeDisplayName})` : '';
    console.log(`    [${i + 1}] ${r.displayName}${specialty}`);
  }

  const recipientChoice = await ask('\n  Select recipient number: ');
  const recipientIdx = parseInt(recipientChoice) - 1;
  if (recipientIdx < 0 || recipientIdx >= recipients.length) {
    console.log('  Invalid recipient selection.');
    return;
  }
  const selectedRecipient = recipients[recipientIdx];

  const subject = cliArgs.subject || await ask('\n  Subject: ');
  const messageBody = cliArgs.message || await ask('  Message: ');

  if (!subject || !messageBody) {
    console.log('  Subject and message are required.');
    return;
  }

  console.log(`\n  Sending message to ${selectedRecipient.displayName}...`);
  console.log(`  Topic: ${selectedTopic.displayName}`);
  console.log(`  Subject: ${subject}`);
  console.log(`  Message: ${messageBody}\n`);

  const result = await sendNewMessage(mychartRequest, {
    recipient: selectedRecipient,
    topic: selectedTopic,
    subject,
    messageBody,
  });

  if (result.success) {
    console.log('  Message sent successfully!');
    console.log(`  Conversation ID: ${result.conversationId}`);
  } else {
    console.log(`  Failed to send message: ${result.error}`);
  }
}

// ─── Send Reply Handler ───

async function handleSendReply(mychartRequest: MyChartRequest) {
  header('Send Reply');

  let conversationId = cliArgs.conversationId;
  let messageBody = cliArgs.message;

  if (!conversationId) {
    // List conversations and let user pick
    subheader('Recent Conversations');
    const conversations = await listConversations(mychartRequest);
    const convoList = conversations?.conversations || [];

    if (convoList.length === 0) {
      console.log('  No conversations found.');
      return;
    }

    for (let i = 0; i < Math.min(convoList.length, 10); i++) {
      const c = convoList[i];
      const audience = c.audience?.map((a: { name: string }) => a.name).join(', ') || 'System';
      console.log(`    [${i + 1}] "${c.subject}" - ${audience}`);
    }

    const convoChoice = await ask('\n  Select conversation to reply to: ');
    const convoIdx = parseInt(convoChoice) - 1;
    if (convoIdx < 0 || convoIdx >= convoList.length) {
      console.log('  Invalid selection.');
      return;
    }
    conversationId = convoList[convoIdx].hthId;
  }

  if (!messageBody) {
    messageBody = await ask('\n  Reply message: ');
  }

  if (!messageBody) {
    console.log('  Message is required.');
    return;
  }

  console.log(`\n  Sending reply...`);
  console.log(`  Message: ${messageBody}\n`);

  const result = await sendReply(mychartRequest, {
    conversationId: conversationId!,
    messageBody,
  });

  if (result.success) {
    console.log('  Reply sent successfully!');
    console.log(`  Conversation ID: ${result.conversationId}`);
  } else {
    console.log(`  Failed to send reply: ${result.error}`);
  }
}

// ─── Main ───

async function main() {
  // Fire-and-forget telemetry — never blocks or breaks the CLI
  sendTelemetryEvent('cli_started', {
    action: cliArgs.action || 'default',
    host: cliArgs.host || 'unknown',
  });

  // Fire-and-forget update check — never blocks or breaks the CLI
  const { version } = await import('../package.json');
  void checkForUpdate({ currentVersion: version, packageName: 'cli' });

  header('MyChart Scraper - Terminal');

  // ─── Resolve credentials from browser passwords ───
  // --read-login-from-browser: scan browser password stores for the given --host (or pick from all MyChart accounts)
  if (cliArgs.readLoginFromBrowser) {
    console.log('\n  Scanning browser password stores for saved MyChart credentials...');
    const accounts = await getMyChartAccounts();
    if (cliArgs.host) {
      const match = accounts.find(a => {
        try { return new URL(a.url).hostname === cliArgs.host; } catch { return false; }
      });
      if (match && match.user && match.pass) {
        console.log(`  Found credentials for ${cliArgs.host} (user: ${match.user})`);
        cliArgs.user = match.user;
        cliArgs.pass = match.pass;
      } else {
        console.log(`  No saved credentials found for ${cliArgs.host}.`);
        closeRL();
        process.exit(1);
      }
    } else {
      // No --host: pick the first MyChart account found
      if (accounts.length === 0) {
        console.log('  No MyChart credentials found in any browser.');
        closeRL();
        process.exit(1);
      }
      const first = accounts[0];
      cliArgs.host = new URL(first.url).hostname;
      cliArgs.user = first.user!;
      cliArgs.pass = first.pass!;
      console.log(`  Using ${cliArgs.host} (user: ${cliArgs.user})`);
    }
  } else if (cliArgs.host && !cliArgs.user && !cliArgs.pass) {
    const resolved = await resolveCredsFromBrowsers(cliArgs.host);
    if (resolved) {
      cliArgs.user = resolved.user;
      cliArgs.pass = resolved.pass;
    } else {
      console.log(`\n  Could not find credentials for ${cliArgs.host}.`);
      console.log(`  Provide them: npx tsx src/cli.ts --host ${cliArgs.host} --user X --pass Y\n`);
      closeRL();
      process.exit(1);
    }
  }
  nonInteractive = !!(cliArgs.host && cliArgs.user && cliArgs.pass);

  let credentialsList: { hostname: string; username: string; password: string }[];

  if (nonInteractive) {
    // Non-interactive mode: credentials from CLI args or Keychain
    console.log(`\n  Non-interactive mode: --host ${cliArgs.host}`);
    credentialsList = [{
      hostname: cliArgs.host!,
      username: cliArgs.user!,
      password: cliArgs.pass!,
    }];
  } else {
    console.log('\n  This tool logs into your MyChart account(s) and scrapes');
    console.log('  your medical data (profile, bills, visits, labs, messages).');
    credentialsList = await getCredentials();
  }

  if (credentialsList.length === 0) {
    console.log('\n  No accounts to scrape. Exiting.');
    closeRL();
    process.exit(0);
  }

  header('Logging In');

  const sessions: { hostname: string; request: MyChartRequest }[] = [];

  for (const creds of credentialsList) {
    const mychartRequest = await login(creds);
    if (mychartRequest) {
      sessions.push({ hostname: creds.hostname, request: mychartRequest });
    }
  }

  if (sessions.length === 0) {
    console.log('\n  Could not log in to any accounts. Exiting.');
    closeRL();
    process.exit(1);
  }

  console.log(`\n  Successfully logged in to ${sessions.length} account(s).`);

  // Handle --set-up-totp: enable TOTP authenticator app and save the secret
  if (cliArgs.setupTotp) {
    for (const session of sessions) {
      header(`Setting up TOTP for ${session.hostname}`);
      // Find the password for this session
      const creds = credentialsList.find(c => c.hostname === session.hostname);
      if (!creds) {
        console.log('  Could not find credentials for this session.');
        continue;
      }
      const result = await setupTotp(session.request, creds.password);
      if (result.secret) {
        await saveTotpSecret(session.hostname, result.secret);
        console.log(`  Done! You can now use --use-saved-totp to skip email 2FA.`);
      } else {
        console.log(`  TOTP setup failed: ${result.error}`);
      }
    }
    closeRL();
    return;
  }

  // Handle --disable-totp: disable TOTP authenticator app
  if (cliArgs.disableTotp) {
    for (const session of sessions) {
      header(`Disabling TOTP for ${session.hostname}`);
      const creds = credentialsList.find(c => c.hostname === session.hostname);
      if (!creds) {
        console.log('  Could not find credentials for this session.');
        continue;
      }
      const totpSecret = await loadTotpSecret(session.hostname);
      if (!totpSecret) {
        console.log(`  No saved TOTP secret found for ${session.hostname}. Cannot disable without a code.`);
        continue;
      }
      const success = await disableTotp(session.request, creds.password, totpSecret);
      if (success) {
        console.log(`  Done! TOTP has been disabled.`);
      } else {
        console.log('  TOTP disable failed. See errors above.');
      }
    }
    closeRL();
    return;
  }

  // Handle --set-up-passkey: register a passkey on the MyChart account
  if (cliArgs.setupPasskey) {
    for (const session of sessions) {
      header(`Setting up passkey for ${session.hostname}`);
      const credential = await setupPasskey(session.request);
      if (credential) {
        await savePasskeyCredential(session.hostname, credential);
        console.log(`  Done! You can now use --use-passkey to login without a password.`);
      } else {
        console.log('  Passkey setup failed. See errors above.');
      }
    }
    closeRL();
    return;
  }

  // Handle send-message action
  if (cliArgs.action === 'send-message') {
    for (const session of sessions) {
      await handleSendMessage(session.request);
    }
    closeRL();
    return;
  }

  // Handle send-reply action
  if (cliArgs.action === 'send-reply') {
    for (const session of sessions) {
      await handleSendReply(session.request);
    }
    closeRL();
    return;
  }

  // Handle delete-message action
  if (cliArgs.action === 'delete-message') {
    for (const session of sessions) {
      let conversationId = cliArgs.conversationId;
      if (!conversationId) {
        conversationId = await ask('  Conversation ID to delete: ');
      }
      if (!conversationId) {
        console.log('  Conversation ID is required.');
        continue;
      }
      console.log(`  Deleting conversation ${conversationId}...`);
      const result = await deleteMessage(session.request, conversationId);
      if (result.success) {
        console.log('  Message deleted successfully!');
      } else {
        console.log(`  Failed to delete message: ${result.error}`);
      }
    }
    closeRL();
    return;
  }

  // Handle request-refill action
  if (cliArgs.action === 'request-refill') {
    for (const session of sessions) {
      const medKey = cliArgs.message || await ask('  Medication key to refill: ');
      if (!medKey) {
        console.log('  Medication key is required.');
        continue;
      }
      console.log(`  Requesting refill for ${medKey}...`);
      const result = await requestMedicationRefill(session.request, medKey);
      if (result.success) {
        console.log('  Refill requested successfully!');
      } else {
        console.log(`  Failed to request refill: ${result.error}`);
      }
    }
    closeRL();
    return;
  }

  // Handle get-imaging action
  if (cliArgs.action === 'get-imaging') {
    const outputDir = path.join(__dirname, '..', 'imaging-output');
    await fs.promises.mkdir(outputDir, { recursive: true });

    for (const session of sessions) {
      header(`Imaging Results: ${session.hostname}`);
      try {
        const imaging = await getImagingResults(session.request);

        if (imaging.length === 0) {
          console.log('    No imaging results found.');
          continue;
        }

        console.log(`    Found ${imaging.length} imaging result(s). Saving JPGs to ./imaging-output/\n`);

        // Save full dump
        const hostDir = path.join(outputDir, session.hostname);
        await fs.promises.mkdir(hostDir, { recursive: true });
        const allPath = path.join(hostDir, `all-imaging.json`);
        await fs.promises.writeFile(allPath, JSON.stringify(imaging, null, 2));
        console.log(`    Saved: ${path.basename(allPath)}`);

        for (const result of imaging) {
          const safeName = result.orderName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
          console.log(`\n      ${result.orderName}`);

          // Save report text if available
          if (result.reportText) {
            const txtName = `${safeName}_report.txt`;
            await fs.promises.writeFile(path.join(hostDir, txtName), result.reportText);
            console.log(`        Saved: ${txtName}`);
          }

          // Download images and convert to JPG if FDI context is available
          // MRI uses a different viewer protocol we don't support yet
          const nameLower = result.orderName.toLowerCase();
          const isUnsupportedModality = nameLower.includes('mri');
          if (isUnsupportedModality && result.fdiContext) {
            console.log(`        Image viewer: available (skipping download — MRI not yet supported)`);
          }
          if (result.fdiContext && !isUnsupportedModality) {
            console.log(`        Image viewer: available (has FDI context)`);
            const studyDir = path.join(hostDir, safeName);
            await fs.promises.mkdir(studyDir, { recursive: true });

            try {
              console.log(`        Downloading image data via direct HTTP...`);
              const directResult = await downloadImagingStudyDirect(
                session.request,
                result.fdiContext,
                result.orderName,
                studyDir,
                { skipFileWrite: true },
              );

              // Convert each CLO buffer to JPG
              let imgCount = 0;
              for (const img of directResult.images) {
                if (img.pixelData) {
                  const safeDesc = img.seriesDescription.replace(/[^a-zA-Z0-9_-]/g, '_');
                  const jpgPath = path.join(studyDir, `${safeDesc}.jpg`);
                  try {
                    await convertCloToJpg(img.pixelData, jpgPath, img.wrapperData);
                    const stat = await fs.promises.stat(jpgPath);
                    console.log(`          Saved: ${safeDesc}.jpg (${(stat.size / 1024).toFixed(0)} KB) - ${img.seriesDescription}`);
                    imgCount++;
                  } catch (convErr) {
                    console.log(`          CLO→JPG conversion failed for ${img.seriesDescription}: ${(convErr as Error).message}`);
                  }
                }
              }

              if (imgCount > 0) {
                console.log(`        Converted ${imgCount} image(s) to JPG`);
              }
              if (directResult.errors.length > 0) {
                for (const err of directResult.errors) {
                  console.log(`        Download warning: ${err}`);
                }
              }
            } catch (err) {
              console.log(`        Download error: ${(err as Error).message}`);
            }
          }

          for (const r of result.results || []) {
            if (r.orderMetadata?.resultTimestampDisplay) {
              item('  Date', r.orderMetadata.resultTimestampDisplay);
            }

            // Save HTML report if available
            if (r.reportDetails?.reportContent?.reportContent) {
              const htmlName = `${safeName}_report.html`;
              const css = r.reportDetails.reportContent.reportCss || '';
              const html = `<html><head><style>${css}</style></head><body>${r.reportDetails.reportContent.reportContent}</body></html>`;
              await fs.promises.writeFile(path.join(hostDir, htmlName), html);
              console.log(`        Saved: ${htmlName}`);
            }

            // Save narrative/impression as text
            if (r.studyResult?.narrative?.hasContent || r.studyResult?.impression?.hasContent) {
              const txtName = `${safeName}_narrative.txt`;
              let text = '';
              if (r.studyResult?.narrative?.hasContent) {
                text += `=== NARRATIVE ===\n${r.studyResult.narrative.contentAsString}\n\n`;
                console.log(`        Narrative: ${r.studyResult.narrative.contentAsString.substring(0, 200)}...`);
              }
              if (r.studyResult?.impression?.hasContent) {
                text += `=== IMPRESSION ===\n${r.studyResult.impression.contentAsString}\n\n`;
                console.log(`        Impression: ${r.studyResult.impression.contentAsString.substring(0, 200)}...`);
              }
              await fs.promises.writeFile(path.join(hostDir, txtName), text);
              console.log(`        Saved: ${txtName}`);
            }

            if (r.imageStudies?.length) {
              console.log(`        Image Studies: ${r.imageStudies.length}`);
            }
            if (r.scans?.length) {
              console.log(`        Scans: ${r.scans.length}`);
            }
          }
        }
      } catch (err) {
        console.log('    Error fetching imaging results:', (err as Error).message);
      }
    }

    console.log('\n    All imaging results saved to ./imaging-output/');
    closeRL();
    return;
  }

  // Handle get-thread action
  if (cliArgs.action === 'get-thread') {
    for (const session of sessions) {
      let conversationId = cliArgs.conversationId;
      if (!conversationId) {
        conversationId = await ask('  Conversation ID: ');
      }
      if (!conversationId) {
        console.log('  Conversation ID is required.');
        continue;
      }
      const thread = await getConversationMessages(session.request, conversationId);
      header(`Thread: ${thread.subject}`);
      for (const msg of thread.messages) {
        console.log(`\n      [${msg.sentDate}] ${msg.senderName}${msg.isFromPatient ? ' (you)' : ''}:`);
        console.log(`        ${msg.messageBody}`);
      }
    }
    closeRL();
    return;
  }

  // Handle keep-alive-test action — use shared sessionStore keepalive
  if (cliArgs.action === 'keep-alive-test') {
    closeRL();

    // Register all sessions in the shared store
    for (const session of sessions) {
      sessionStore.set(session.hostname, session.request, { hostname: session.hostname });
    }

    console.log('\n  ── Keep-Alive Test Mode ──');
    console.log(`  Pinging KeepAlive every 30s for ${sessions.length} session(s).`);
    console.log('  Press Ctrl+C to stop.\n');

    // Ping immediately, then start the interval
    await sessionStore.runKeepalive();
    sessionStore.startKeepalive();
    return;
  }

  for (const session of sessions) {
    await scrapeAll(session.request, session.hostname);
  }

  header('Done!');
  console.log(`  Scraped ${sessions.length} MyChart account(s).`);
  console.log('  All available data has been displayed above.\n');

  closeRL();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  closeRL();
  process.exit(1);
});
