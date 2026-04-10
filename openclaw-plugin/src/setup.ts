/**
 * Interactive setup CLI for MyChart plugin — Multi-Account.
 *
 * Registered as `openclaw openrecord setup`, `openclaw openrecord status`, `openclaw openrecord reset`.
 */

import * as readline from 'readline';
import { myChartUserPassLogin, complete2faFlow } from '../../scrapers/myChart/login';
import { setupPasskey } from '../../scrapers/myChart/setupPasskey';
import { serializeCredential } from '../../scrapers/myChart/softwareAuthenticator';
import { browserPasswordDbExists, importMyChartAccounts } from './password-import';
import { clearSession, clearAllSessions, clearActiveAccount, resolveSession } from './index';
import { isBlockedInstance } from '../../shared/blockedInstances';
import {
  readAccounts, addAccount, removeAccount, saveAccounts,
  readAccountPasskey, saveAccountPasskey, clearAccountPasskey, clearAllPasskeys,
  normalizeHostname, type AccountConfig,
} from './config';
import { getMyChartProfile } from '../../scrapers/myChart/profile';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OpenClawApi = any;

/** Extract hostname from a URL or return the input as-is if it's already a hostname. */
export function parseHostname(input: string): string {
  try {
    const parsed = new URL(input.includes('://') ? input : `https://${input}`);
    return parsed.hostname;
  } catch {
    return input;
  }
}

function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

function askMasked(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => {
    const stdout = process.stdout;
    stdout.write(question);

    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    if (stdin.isTTY) stdin.setRawMode(true);

    let input = '';
    const onData = (ch: Buffer) => {
      const c = ch.toString();
      if (c === '\n' || c === '\r') {
        stdout.write('\n');
        if (stdin.isTTY) stdin.setRawMode(wasRaw ?? false);
        stdin.removeListener('data', onData);
        resolve(input);
      } else if (c === '\u0003') {
        // Ctrl+C
        stdout.write('\n');
        if (stdin.isTTY) stdin.setRawMode(wasRaw ?? false);
        stdin.removeListener('data', onData);
        resolve('');
      } else if (c === '\u007f' || c === '\b') {
        // Backspace
        if (input.length > 0) {
          input = input.slice(0, -1);
          stdout.write('\b \b');
        }
      } else {
        input += c;
        stdout.write('*');
      }
    };
    stdin.on('data', onData);
  });
}

// ── Setup command (additive) ────────────────────────────────────────────────

async function setupCommand(): Promise<void> {
  const rl = createReadline();

  try {
    const existingAccounts = readAccounts();
    console.log('\nWelcome to MyChart Health Data for OpenClaw!\n');
    if (existingAccounts.length > 0) {
      console.log(`You have ${existingAccounts.length} account(s) configured:`);
      existingAccounts.forEach((a, i) => console.log(`  [${i + 1}] ${a.hostname} — ${a.username}`));
      console.log('\nThis setup will add a new account or update an existing one.\n');
    } else {
      console.log('This setup will configure your MyChart credentials so the plugin');
      console.log('can access your health data autonomously.\n');
    }

    let hostname = '';
    let username = '';
    let password = '';

    // Check if browser passwords are available
    const hasPasswords = browserPasswordDbExists();

    if (hasPasswords) {
      const choice = await ask(rl, 'How would you like to configure?\n  [1] Import from browser passwords\n  [2] Enter manually\n\nChoice (1/2): ');

      if (choice.trim() === '1') {
        console.log('\nSearching browser password stores...');
        const accounts = await importMyChartAccounts();

        if (accounts.length === 0) {
          console.log('No MyChart accounts found in browser passwords. Switching to manual entry.\n');
        } else {
          console.log(`\nFound ${accounts.length} MyChart account(s):\n`);
          accounts.forEach((a, i) => {
            console.log(`  [${i + 1}] ${a.hostname} — ${a.username}`);
          });

          const pick = await ask(rl, `\nSelect account (1-${accounts.length}): `);
          const idx = parseInt(pick.trim(), 10) - 1;

          if (idx >= 0 && idx < accounts.length) {
            hostname = accounts[idx].hostname;
            username = accounts[idx].username;
            password = accounts[idx].password;
            console.log(`\nSelected: ${hostname} (${username})\n`);
          } else {
            console.log('Invalid selection. Switching to manual entry.\n');
          }
        }
      }
    }

    // Manual entry if we don't have credentials yet
    if (!hostname) {
      const hostnameInput = (await ask(rl, 'MyChart hostname or URL (e.g. mychart.example.org): ')).trim();
      if (!hostnameInput) {
        console.log('Hostname is required. Aborting setup.');
        return;
      }
      hostname = parseHostname(hostnameInput);
      if (isBlockedInstance(hostname)) {
        console.log('This MyChart instance is not supported. central.mychart.org is a portal aggregator and cannot be scraped directly. Please use the individual hospital MyChart instance instead.');
        return;
      }
    }
    if (!username) {
      username = (await ask(rl, 'Username: ')).trim();
      if (!username) {
        console.log('Username is required. Aborting setup.');
        return;
      }
    }
    if (!password) {
      // Close readline for masked input, then reopen
      rl.close();
      const rl2 = createReadline();
      password = await askMasked(rl2, 'Password: ');
      rl2.close();
      if (!password) {
        console.log('Password is required. Aborting setup.');
        return;
      }
    }

    // Check if account already exists
    const normalizedHost = normalizeHostname(hostname);
    const existing = existingAccounts.find(a => normalizeHostname(a.hostname) === normalizedHost);
    if (existing) {
      const confirmRl = createReadline();
      const overwrite = await ask(confirmRl, `\nAccount for ${hostname} already exists (${existing.username}). Update it? (y/n): `);
      confirmRl.close();
      if (overwrite.trim().toLowerCase() !== 'y') {
        console.log('Setup cancelled.\n');
        return;
      }
      // Clear old passkey for this account since credentials are changing
      clearAccountPasskey(normalizedHost);
      clearSession(normalizedHost);
    }

    // Validate credentials
    console.log('\nValidating credentials...');
    const loginResult = await myChartUserPassLogin({
      hostname,
      user: username,
      pass: password,
      skipSendCode: false,
    });

    if (loginResult.state === 'invalid_login') {
      console.log('Login failed: username or password is incorrect.');
      console.log('Please check your credentials and try again.');
      return;
    }

    if (loginResult.state === 'error') {
      console.log(`Login error: ${loginResult.error}`);
      return;
    }

    let authenticatedSession: import('../../scrapers/myChart/myChartRequest').MyChartRequest | null = null;

    if (loginResult.state === 'need_2fa') {
      // For initial setup, complete 2FA with email code
      console.log('\nYour account requires 2FA. A code has been sent to your email.');
      const codeRl = createReadline();
      const code = (await ask(codeRl, 'Enter 2FA code: ')).trim();
      codeRl.close();

      if (!code) {
        console.log('2FA code is required. Aborting setup.');
        return;
      }

      const twoFaResult = await complete2faFlow({
        mychartRequest: loginResult.mychartRequest,
        code,
      });

      if (twoFaResult.state !== 'logged_in') {
        console.log(`2FA verification failed (${twoFaResult.state}). Please try again.`);
        return;
      }

      console.log('2FA verification successful!\n');
      authenticatedSession = twoFaResult.mychartRequest;
    } else {
      console.log('Login successful! (no 2FA required)\n');
      authenticatedSession = loginResult.mychartRequest;
    }

    // Offer passkey setup for automatic sign-in (bypasses 2FA entirely)
    let passkeyJson: string | undefined;
    if (authenticatedSession) {
      const passkeyRl = createReadline();
      console.log('Enable automatic sign-in?');
      console.log('A passkey lets the AI agent log into your MyChart account automatically');
      console.log('without needing email verification codes each time.');
      console.log('\nThis adds a passkey to your MyChart security settings.');
      console.log('You can remove it anytime from your MyChart account.\n');
      const setupChoice = await ask(passkeyRl, 'Set up a passkey? (y/n): ');
      passkeyRl.close();

      if (setupChoice.trim().toLowerCase() === 'y') {
        console.log('\nRegistering passkey...');
        try {
          const credential = await setupPasskey(authenticatedSession);
          if (credential) {
            passkeyJson = serializeCredential(credential);
            console.log('Passkey registered successfully!\n');
          } else {
            console.log('Passkey registration was not available on this MyChart instance.\n');
          }
        } catch (err) {
          console.log(`Passkey setup failed: ${(err as Error).message}\n`);
          // Offer retry
          const retryRl = createReadline();
          const retryChoice = await ask(retryRl, 'Retry passkey setup? (y/n): ');
          retryRl.close();
          if (retryChoice.trim().toLowerCase() === 'y') {
            console.log('\nRetrying passkey registration...');
            try {
              const credential = await setupPasskey(authenticatedSession);
              if (credential) {
                passkeyJson = serializeCredential(credential);
                console.log('Passkey registered successfully!\n');
              } else {
                console.log('Passkey registration was not available. Continuing without passkey.\n');
              }
            } catch (retryErr) {
              console.log(`Passkey setup failed again: ${(retryErr as Error).message}\nContinuing without passkey.\n`);
            }
          }
        }
      }
    }

    // Save account
    const account: AccountConfig = {
      hostname: normalizedHost,
      username,
      password,
    };
    if (passkeyJson) {
      saveAccountPasskey(normalizedHost, passkeyJson);
    }

    addAccount(account);

    const totalAccounts = readAccounts().length;
    console.log(`Setup complete! Account for ${hostname} has been saved. (${totalAccounts} account(s) total)`);
    console.log('The plugin will now automatically log in when you use health data tools.\n');
    if (passkeyJson) {
      console.log('Passkey is configured — login will be fully automatic (no 2FA needed).');
    } else {
      console.log('Warning: Without a passkey, sessions expire after a few hours and require email 2FA to reconnect.');
      console.log('Tip: Run `openclaw openrecord setup` again later to set up a passkey.');
    }
  } finally {
    rl.close();
  }
}

// ── Status command (with live connection check) ─────────────────────────────

async function statusCommand(hostname?: string, opts?: { host?: string; interactive?: boolean }): Promise<void> {
  const accounts = readAccounts();
  if (accounts.length === 0) {
    console.log('\nMyChart plugin is not configured.');
    console.log('Run `openclaw openrecord setup` to get started.\n');
    return;
  }

  // Determine which accounts to show
  const targetHost = hostname || opts?.host;
  let accountsToShow: AccountConfig[];

  if (opts?.interactive) {
    // Interactive mode: list accounts, prompt for selection
    console.log(`\n${accounts.length} account(s) configured:\n`);
    accounts.forEach((a, i) => console.log(`  [${i + 1}] ${a.hostname} — ${a.username}`));
    const rl = createReadline();
    const pick = await ask(rl, `\nSelect account (1-${accounts.length}): `);
    rl.close();
    const idx = parseInt(pick.trim(), 10) - 1;
    if (idx < 0 || idx >= accounts.length) {
      console.log('Invalid selection.');
      return;
    }
    accountsToShow = [accounts[idx]];
  } else if (targetHost) {
    const normalized = normalizeHostname(targetHost);
    const found = accounts.filter(a => normalizeHostname(a.hostname) === normalized);
    if (found.length === 0) {
      console.log(`\nNo account found for hostname: ${targetHost}`);
      console.log('Configured accounts:');
      accounts.forEach(a => console.log(`  - ${a.hostname}`));
      console.log();
      return;
    }
    accountsToShow = found;
  } else {
    accountsToShow = accounts;
  }

  console.log('\nMyChart Plugin Status:\n');

  for (let i = 0; i < accountsToShow.length; i++) {
    const a = accountsToShow[i];
    const passkey = readAccountPasskey(a.hostname);

    // Determine passkey/connection status by attempting a silent login
    let passkeyStatus: string;
    let accountSuffix = '';
    if (passkey) {
      // Suppress verbose scraper logging during the check
      const origLog = console.log;
      const origErr = console.error;
      console.log = () => {};
      console.error = () => {};
      try {
        const session = await resolveSession(a.hostname);
        const profile = await getMyChartProfile(session);
        const name = profile?.name || 'Unknown';
        passkeyStatus = 'Active';
        accountSuffix = ` \u2014 ${name}`;
      } catch {
        passkeyStatus = 'Stale';
      } finally {
        console.log = origLog;
        console.error = origErr;
      }
    } else {
      passkeyStatus = 'Not configured';
    }

    console.log(`  Account ${i + 1}: ${a.hostname}${accountSuffix}`);
    console.log(`    Username:    ${a.username}`);
    console.log(`    Password:    ${'*'.repeat(Math.min(a.password.length, 12))}`);
    console.log(`    Passkey:     ${passkeyStatus}`);
    console.log();
  }

  console.log(`${accounts.length} account(s) configured.\n`);
  process.exit(0);
}

// ── Reset command (selective or full) ───────────────────────────────────────

async function resetCommand(hostname?: string, opts?: { all?: boolean }): Promise<void> {
  const accounts = readAccounts();

  if (accounts.length === 0) {
    console.log('\nNo accounts configured. Nothing to reset.\n');
    return;
  }

  // Reset all
  if (opts?.all) {
    clearAllSessions();
    clearActiveAccount();
    clearAllPasskeys();
    saveAccounts([]);
    console.log(`\nAll ${accounts.length} account(s) have been removed.`);
    console.log('Run `openclaw openrecord setup` to reconfigure.\n');
    return;
  }

  // Reset specific hostname
  if (hostname) {
    const normalized = normalizeHostname(hostname);
    const found = accounts.find(a => normalizeHostname(a.hostname) === normalized);
    if (!found) {
      console.log(`\nNo account found for hostname: ${hostname}`);
      console.log('Configured accounts:');
      accounts.forEach(a => console.log(`  - ${a.hostname}`));
      console.log();
      return;
    }
    clearSession(normalized);
    clearActiveAccount();
    clearAccountPasskey(normalized);
    removeAccount(normalized);
    console.log(`\nAccount for ${found.hostname} has been removed.`);
    console.log(`${accounts.length - 1} account(s) remaining.\n`);
    return;
  }

  // Interactive: list accounts, ask which to remove
  console.log(`\n${accounts.length} account(s) configured:\n`);
  accounts.forEach((a, i) => console.log(`  [${i + 1}] ${a.hostname} — ${a.username}`));
  console.log(`  [A] Remove all accounts`);

  const rl = createReadline();
  const pick = await ask(rl, `\nSelect account to remove (1-${accounts.length}) or A for all: `);
  rl.close();

  if (pick.trim().toLowerCase() === 'a') {
    clearAllSessions();
    clearActiveAccount();
    clearAllPasskeys();
    saveAccounts([]);
    console.log(`\nAll ${accounts.length} account(s) have been removed.`);
    console.log('Run `openclaw openrecord setup` to reconfigure.\n');
    return;
  }

  const idx = parseInt(pick.trim(), 10) - 1;
  if (idx < 0 || idx >= accounts.length) {
    console.log('Invalid selection. No changes made.');
    return;
  }

  const target = accounts[idx];
  clearSession(target.hostname);
  clearActiveAccount();
  clearAccountPasskey(target.hostname);
  removeAccount(target.hostname);
  console.log(`\nAccount for ${target.hostname} has been removed.`);
  console.log(`${accounts.length - 1} account(s) remaining.\n`);
}

// ── Register CLI ─────────────────────────────────────────────────────────────

export function registerCliCommands(api: OpenClawApi) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api.registerCli((ctx: { program: any; config: any; logger: any }) => {
    const openrecord = ctx.program.command('openrecord')
      .description('OpenRecord health data plugin');

    openrecord.command('setup')
      .description('Add or update a MyChart account')
      .action(() => setupCommand());

    openrecord.command('status')
      .argument('[hostname]', 'Hostname of account to check')
      .option('--host <hostname>', 'Hostname of account to check')
      .option('-i, --interactive', 'Interactively select an account')
      .description('Show MyChart account status with live connection check')
      .action((hostname: string | undefined, opts: { host?: string; interactive?: boolean }) => statusCommand(hostname, opts));

    openrecord.command('reset')
      .argument('[hostname]', 'Hostname of account to remove')
      .option('--all', 'Remove all accounts')
      .description('Remove a MyChart account or all accounts')
      .action((hostname: string | undefined, opts: { all?: boolean }) => resetCommand(hostname, opts));
  }, { commands: ['openrecord'] });
}
