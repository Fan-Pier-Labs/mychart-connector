/**
 * Interactive setup CLI for MyChart plugin.
 *
 * Registered as `openclaw openrecord setup`, `openclaw openrecord status`, `openclaw openrecord reset`, and `openclaw openrecord ping`.
 */

import * as readline from 'readline';
import { myChartUserPassLogin, complete2faFlow } from '../../scrapers/myChart/login';
import { setupPasskey } from '../../scrapers/myChart/setupPasskey';
import { serializeCredential } from '../../scrapers/myChart/softwareAuthenticator';
import { browserPasswordDbExists, importMyChartAccounts } from './password-import';
import { clearSession, ensureSession } from './index';
import { isBlockedInstance } from '../../shared/blockedInstances';
import { savePluginConfig, savePasskey, readPasskey, clearPasskey } from './config';
import { getMyChartProfile } from '../../scrapers/myChart/profile';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OpenClawApi = any;

interface Credentials {
  hostname: string;
  username: string;
  password: string;
  totpSecret?: string;
}

function getCredentials(api: OpenClawApi): Credentials | null {
  const cfg = api.pluginConfig;
  if (!cfg?.hostname || !cfg?.username || !cfg?.password) return null;
  return {
    hostname: cfg.hostname,
    username: cfg.username,
    password: cfg.password,
    totpSecret: cfg.totpSecret || undefined,
  };
}


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

async function setupCommand(): Promise<void> {
  const rl = createReadline();

  try {
    console.log('\nWelcome to MyChart Health Data for OpenClaw!\n');
    console.log('This setup will configure your MyChart credentials so the plugin');
    console.log('can access your health data autonomously.\n');

    // Warn if existing account/passkey is configured
    const existingPasskey = readPasskey();
    if (existingPasskey) {
      console.log('An existing passkey is already configured.');
      const overwrite = await ask(rl, 'Replace existing account and passkey? (y/n): ');
      if (overwrite.trim().toLowerCase() !== 'y') {
        console.log('Setup cancelled.\n');
        return;
      }
      clearPasskey();
      clearSession();
      console.log('');
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

    // Save config
    const config: Record<string, string> = {
      hostname,
      username,
      password,
    };
    if (passkeyJson) {
      savePasskey(passkeyJson);
    }

    savePluginConfig(config);

    console.log('Setup complete! Your MyChart credentials have been saved.');
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

async function statusCommand(api: OpenClawApi): Promise<void> {
  const creds = getCredentials(api);
  if (!creds) {
    console.log('\nMyChart plugin is not configured.');
    console.log('Run `openclaw openrecord setup` to get started.\n');
    return;
  }

  console.log('\nMyChart Plugin Status:');
  console.log(`  Hostname:     ${creds.hostname}`);
  console.log(`  Username:     ${creds.username}`);
  console.log(`  Password:     ${'*'.repeat(Math.min(creds.password.length, 12))}`);
  console.log(`  TOTP:         ${creds.totpSecret ? 'Configured' : 'Not configured'}`);
  console.log(`  Passkey:      ${readPasskey() ? 'Configured' : 'Not configured'}`);
  console.log();
}

async function resetCommand(): Promise<void> {
  clearSession();
  clearPasskey();
  savePluginConfig({});
  console.log('\nMyChart plugin configuration has been reset.');
  console.log('Run `openclaw openrecord setup` to reconfigure.\n');
}

async function pingCommand(api: OpenClawApi): Promise<void> {
  try {
    const session = await ensureSession(api);
    const profile = await getMyChartProfile(session);
    const name = profile?.name || 'Unknown';
    console.log(`\n  ✓ Login successful — ${name}`);
    console.log('  status: true\n');
  } catch (err) {
    console.error(`\n  ✗ ${(err as Error).message}`);
    console.log('  status: false\n');
    process.exitCode = 1;
  }
}

export function registerCliCommands(api: OpenClawApi) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api.registerCli((ctx: { program: any; config: any; logger: any }) => {
    const openrecord = ctx.program.command('openrecord')
      .description('OpenRecord health data plugin');

    openrecord.command('setup')
      .description('Set up MyChart credentials and TOTP for automatic login')
      .action(() => setupCommand());

    openrecord.command('status')
      .description('Show current MyChart plugin configuration status')
      .action(() => statusCommand(api));

    openrecord.command('reset')
      .description('Clear saved MyChart credentials and reset the plugin')
      .action(() => resetCommand());

    openrecord.command('ping')
      .description('Login with saved credentials/passkey and verify by fetching profile')
      .action(() => pingCommand(api));
  }, { commands: ['openrecord'] });
}
