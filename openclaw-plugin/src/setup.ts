/**
 * Interactive setup CLI for MyChart plugin.
 *
 * Registered as `openclaw openrecord setup`, `openclaw openrecord status`, `openclaw openrecord reset`, and `openclaw openrecord ping`.
 */

import * as readline from 'readline';
import { myChartUserPassLogin, complete2faFlow } from '../../scrapers/myChart/login';
import { setupTotp } from '../../scrapers/myChart/setupTotp';
import { setupPasskey } from '../../scrapers/myChart/setupPasskey';
import { generateTotpCode } from '../../scrapers/myChart/totp';
import { serializeCredential } from '../../scrapers/myChart/softwareAuthenticator';
import { browserPasswordDbExists, importMyChartAccounts } from './password-import';
import { clearSession, ensureSession } from './index';
import { isBlockedInstance } from '../../shared/blockedInstances';
import { savePluginConfig } from './config';
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
      hostname = (await ask(rl, 'MyChart hostname (e.g. mychart.example.org): ')).trim();
      if (!hostname) {
        console.log('Hostname is required. Aborting setup.');
        return;
      }
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

    let totpSecret: string | undefined;
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

      // Offer TOTP setup — explain why it's needed for the AI agent
      const totpRl = createReadline();
      console.log('\nEnable automatic sign-in?');
      console.log('To access your MyChart account on your behalf, the AI agent needs to sign in');
      console.log('automatically. We\'ll set up a TOTP authenticator so the agent can log in');
      console.log('without requiring email codes each time.');
      console.log('\nThis adds an authenticator app to your MyChart security settings.');
      console.log('You can disable it anytime from your MyChart account.\n');
      const setupTotpChoice = await ask(totpRl, 'Enable automatic sign-in? (y/n): ');
      totpRl.close();

      if (setupTotpChoice.trim().toLowerCase() === 'y') {
        console.log('\nSetting up TOTP authenticator...');
        const result = await setupTotp(twoFaResult.mychartRequest, password);

        if (result.secret) {
          console.log('Verifying TOTP setup...');
          const verifyCode = await generateTotpCode(result.secret);
          console.log(`Generated test code: ${verifyCode}`);
          totpSecret = result.secret;
          console.log('TOTP authenticator set up successfully!\n');
        } else {
          console.log(`\nTOTP setup failed: ${result.error}`);
          console.log('Without automatic sign-in, your session will only last a few hours.');
          console.log('Once it expires, you\'ll need to log in again with email verification.');
          console.log('The AI agent won\'t be able to reconnect to your MyChart account automatically.\n');
          const retryRl = createReadline();
          const retryChoice = await ask(retryRl, 'Retry TOTP setup? (y/n): ');
          retryRl.close();
          if (retryChoice.trim().toLowerCase() === 'y') {
            console.log('\nRetrying TOTP setup...');
            const retryResult = await setupTotp(twoFaResult.mychartRequest, password);
            if (retryResult.secret) {
              console.log('Verifying TOTP setup...');
              await generateTotpCode(retryResult.secret);
              totpSecret = retryResult.secret;
              console.log('TOTP authenticator set up successfully!\n');
            } else {
              console.log(`TOTP setup failed again: ${retryResult.error}\nContinuing without automatic sign-in.\n`);
            }
          }
        }
      } else {
        console.log('\nWarning: 2FA not configured.');
        console.log('Without automatic sign-in, your session will only last a few hours.');
        console.log('Once it expires, you\'ll need to log in again with email verification.');
        console.log('The AI agent won\'t be able to reconnect to your MyChart account automatically.\n');
        const retryRl = createReadline();
        const retryChoice = await ask(retryRl, 'Retry TOTP setup? (y/n): ');
        retryRl.close();
        if (retryChoice.trim().toLowerCase() === 'y') {
          console.log('\nSetting up TOTP authenticator...');
          const retryResult = await setupTotp(twoFaResult.mychartRequest, password);
          if (retryResult.secret) {
            console.log('Verifying TOTP setup...');
            await generateTotpCode(retryResult.secret);
            totpSecret = retryResult.secret;
            console.log('TOTP authenticator set up successfully!\n');
          } else {
            console.log(`TOTP setup failed: ${retryResult.error}\nContinuing without automatic sign-in.\n`);
          }
        }
      }
      // Capture authenticated session for passkey setup
      authenticatedSession = twoFaResult.mychartRequest;
    } else {
      console.log('Login successful! (no 2FA required)\n');
      authenticatedSession = loginResult.mychartRequest;
    }

    // Set up passkey for future logins (bypasses 2FA entirely)
    let passkeyJson: string | undefined;
    if (authenticatedSession) {
      console.log('Registering passkey for future logins...');
      try {
        const credential = await setupPasskey(authenticatedSession);
        if (credential) {
          passkeyJson = serializeCredential(credential);
          console.log('Passkey registered — future logins will use passkey (no 2FA needed).\n');
        } else {
          console.log('Passkey registration was not available. Continuing without passkey.\n');
        }
      } catch (err) {
        console.log(`Passkey setup failed: ${(err as Error).message}. Continuing without passkey.\n`);
      }
    }

    // Save config
    const config: Record<string, string> = {
      hostname,
      username,
      password,
    };
    if (totpSecret) {
      config.totpSecret = totpSecret;
    }
    if (passkeyJson) {
      config.passkey = passkeyJson;
    }

    savePluginConfig(config);

    console.log('Setup complete! Your MyChart credentials have been saved.');
    console.log('The plugin will now automatically log in when you use health data tools.\n');
    if (passkeyJson) {
      console.log('Passkey is configured — login will be fully automatic (no 2FA needed).');
    } else if (totpSecret) {
      console.log('TOTP is configured — login will be fully automatic.');
    } else {
      console.log('Warning: Without TOTP or passkey, sessions expire after a few hours and require email 2FA to reconnect.');
      console.log('Tip: Run `openclaw openrecord setup` again later to enable automatic sign-in.');
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
  const cfg = api.pluginConfig;
  console.log(`  Passkey:      ${cfg?.passkey ? 'Configured' : 'Not configured'}`);
  console.log();
}

async function resetCommand(): Promise<void> {
  clearSession();
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
