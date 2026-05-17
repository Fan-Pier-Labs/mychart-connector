# mychart-cli

Programmatic access to Epic MyChart patient portals from Node.js. Log in,
fetch every section of a patient's chart, and act on it (request refills,
send messages, manage emergency contacts) — all running locally in your
process.

This is the same scraper engine that powers
[openrecord.fanpierlabs.com](https://openrecord.fanpierlabs.com), packaged
for you to embed in your own integration.

📖 **Full API reference:** [docs.md](./docs.md) — every `MyChartClient`
method, raw scraper function, and exported type with signatures and
return shapes.

## Install

```bash
npm install mychart-cli
```

The package installs a CLI binary at `node_modules/.bin/mychart-cli`
(use it via `npx mychart-cli …`). You only run the CLI once, to set
up a passkey — see Quick start.

## Quick start

The recommended setup flow is **one-shot interactive**: register a
passkey via the CLI, save it, and from then on log in from code with no
prompts.

### 1. Register a passkey

Run the bundled CLI once:

```bash
npx mychart-cli --set-up-passkey --host mychart.example.org
```

The CLI walks you through username + password + 2FA, registers a new
passkey on your MyChart account (the same WebAuthn flow the official
MyChart app uses), and writes the credential to:

```
./.passkey-credentials/mychart.example.org.json
```

### 2. Add the credentials directory to `.gitignore`

```
echo '.passkey-credentials/' >> .gitignore
```

The file contains a private key — never commit it.

## CLI examples

The CLI works standalone — you don't need to write any code to fetch
your chart, send a message, or refill a prescription. Every flag is
also documented in the [CLI reference](#cli-reference) table below.

```bash
# Smoke test: log in interactively and dump every scrape category.
# Prompts for username, password, and 2FA code.
npx mychart-cli --host mychart.example.org

# Same, fully non-interactive: pass creds + 2FA code on the command line.
npx mychart-cli --host mychart.example.org \
  --user alice@example.com --pass 'hunter2' --2fa 123456

# Auto-fill creds from your browser's saved password store
# (Chrome, Arc, and Firefox are supported). Still prompts for 2FA.
npx mychart-cli --host mychart.example.org --read-login-from-browser

# Auto-pick the first MyChart account found across all browsers.
npx mychart-cli --read-login-from-browser
```

**Passkey workflow** — register once, then log in with no prompts ever
again:

```bash
# One-time setup: register a passkey on the account.
npx mychart-cli --host mychart.example.org --set-up-passkey

# Every subsequent login: zero prompts, no 2FA code needed.
npx mychart-cli --host mychart.example.org --use-passkey

# Manage passkeys on the account.
npx mychart-cli --host mychart.example.org --list-passkeys
npx mychart-cli --host mychart.example.org --delete-passkey
```

**TOTP workflow** — if you'd rather use an authenticator-app code as
your second factor:

```bash
# Register a TOTP authenticator on the account. The CLI writes the
# secret to ./.totp-secrets/<host>.txt and prints a QR code.
npx mychart-cli --host mychart.example.org --set-up-totp

# Re-use the saved TOTP secret on every login — no prompt.
npx mychart-cli --host mychart.example.org --use-saved-totp

# Disable TOTP on the account.
npx mychart-cli --host mychart.example.org --disable-totp
```

**One-shot actions** — send a message, request a refill, download an
imaging study:

```bash
# Compose a new message to your care team.
npx mychart-cli --host mychart.example.org --action send-message \
  --subject "Question about my medication" \
  --message "Hi — is it okay to take this with food?"

# Reply to an existing message thread.
npx mychart-cli --host mychart.example.org --action send-reply \
  --conversation-id <id> --message "Thanks!"

# Request a refill on a current prescription (CLI walks you through
# picking which med and which pharmacy).
npx mychart-cli --host mychart.example.org --action request-refill

# Download an imaging study (X-ray, MRI, CT) as JPEGs.
npx mychart-cli --host mychart.example.org --action get-imaging
```

## AI agent prompt

Want to give an AI assistant (Claude, ChatGPT, Cursor, etc.) access to
your chart? Install the CLI globally and copy-paste the block below into
the assistant's system prompt or first message. The agent can then run
`mychart-cli` via its shell tool to read and act on your records.

```bash
npm install -g mychart-cli
```

```text
You have access to `mychart-cli`, a command-line tool that connects to
Epic MyChart patient portals. It can log in (password+2FA, TOTP, or
passkey), scrape every section of a patient's chart (medications, lab
results, imaging, visits, messages, billing, allergies, immunizations,
preventive care, etc.), and act on it (send messages, reply to threads,
request prescription refills, manage emergency contacts).

To use it, run shell commands with the bundled `mychart-cli` binary.
The first positional argument is always `--host <hostname>`, where the
hostname is the MyChart portal domain (e.g. `mychart.example.org`).

If a passkey has been registered for this host (look for
`./.passkey-credentials/<host>.json`), prefer `--use-passkey` — it logs
in with zero prompts. Otherwise you'll need `--user`, `--pass`, and a
`--2fa` code, or you can use `--read-login-from-browser` to auto-fill
credentials from the user's saved browser passwords.

Common commands you can run:

  # Log in and dump every scrape category to stdout (medications,
  # labs, imaging, visits, messages, etc.).
  mychart-cli --host mychart.example.org --use-passkey

  # Non-interactive login with explicit credentials.
  mychart-cli --host mychart.example.org \
    --user $USER --pass $PASS --2fa 123456

  # Send a new message to the care team.
  mychart-cli --host mychart.example.org --use-passkey \
    --action send-message --subject "..." --message "..."

  # Reply to an existing thread.
  mychart-cli --host mychart.example.org --use-passkey \
    --action send-reply --conversation-id <id> --message "..."

  # Request a refill (interactive — picks med and pharmacy).
  mychart-cli --host mychart.example.org --use-passkey \
    --action request-refill

  # Download an imaging study as JPEGs.
  mychart-cli --host mychart.example.org --use-passkey \
    --action get-imaging

For the full flag reference and library API (you can also call
`MyChartClient` directly from JavaScript or TypeScript), see
https://www.npmjs.com/package/mychart-cli.

Never print the user's password, 2FA codes, or raw passkey credential
bytes back to them. Treat scraped medical data as PII — don't log it
to third-party services without explicit permission.
```

## Using the passkey from your code

```ts
import {
  MyChartClient,
  deserializeCredential,
  serializeCredential,
} from 'mychart-cli';
import * as fs from 'node:fs/promises';

const path = './.passkey-credentials/mychart.example.org.json';
const credential = deserializeCredential(await fs.readFile(path, 'utf8'));

const result = await MyChartClient.connectWithPasskey({
  hostname: 'mychart.example.org',
  credential,
});
if (result.state !== 'connected') throw new Error('passkey login failed');
const client = result.client;

const meds = await client.getMedications();
console.log(meds);

client.close();

// IMPORTANT — see Authentication section below.
await fs.writeFile(path, serializeCredential(credential));
```

That's it. No more 2FA codes, no more prompts. Re-run the CLI's
`--set-up-passkey` only if you want to register a new passkey (e.g.
because you cleared the stored one).

For the full list of methods on `client`, see [docs.md](./docs.md).

## Authentication

Passkey-based login is the **recommended** auth flow for this package
because it's the only one that runs end-to-end without a human typing
in a 2FA code on every login. After the one-shot CLI setup above,
`MyChartClient.connectWithPasskey` is non-interactive and bypasses 2FA.

### `signCount` — must be persisted after every login

> [!IMPORTANT]
> A passkey credential is **not a static key**. Its `signCount` increments
> every time you log in. WebAuthn requires the counter to monotonically
> increase across logins; if you replay the *same* credential bytes twice,
> MyChart will reject the second attempt as a possible cloned authenticator.
>
> After every successful `connectWithPasskey` call you **must** re-serialize
> the credential and overwrite the file on disk. The Quick-start example
> above does exactly this.
>
> Concretely: load → use → re-save. Don't bake the passkey into a Docker
> image, a `process.env`, or anything else immutable. Treat it like a
> rotating session token that you persist back after every use.

### Other auth options

If a passkey doesn't fit your use case, the package also exposes:

- **Username + password + 2FA** — `MyChartClient.connect({ hostname, user, pass })`.
  Returns `{ state: 'connected', client }` for instances without 2FA, or
  `{ state: 'need_2fa', complete, delivery, sentAt }` when MyChart sent a
  code. Call `await pending.complete(code)` to finish.
- **TOTP** — if the user has an authenticator app set up, derive the code
  with `MyChartClient.totpCode(secret)` and pass `{ isTOTP: true }` to
  `pending.complete`.
- **Restored sessions** — `MyChartClient.fromSerialized(json)` rehydrates
  a previously-`serialize()`d session without re-logging-in. Handy when
  you want to dispatch from a queue and don't want to keep re-authing.

All of these still ultimately depend on either a human typing a code or
a saved TOTP secret, so prefer passkeys for unattended automation. See
[docs.md](./docs.md) for the full signatures.

## CLI reference

```
npx mychart-cli --host <hostname> [flags]
```

| Flag | Purpose |
| --- | --- |
| `--host <hostname>` | MyChart instance hostname. Required. |
| `--user <username>` | Skip the username prompt. |
| `--pass <password>` | Skip the password prompt. |
| `--2fa <code>` | Skip the 2FA prompt; use this code directly. |
| `--set-up-passkey` | Register a new passkey on the account, save it under `./.passkey-credentials/<host>.json`. **Run this once.** |
| `--use-passkey` | Log in with a previously-saved passkey instead of password+2FA. |
| `--list-passkeys` | After login, print all passkeys registered on the account. |
| `--delete-passkey` | Interactively delete a passkey by `rawId`. |
| `--set-up-totp` | Register a TOTP authenticator on the account, save the secret to `./.totp-secrets/<host>.txt`. |
| `--use-saved-totp` | Use the saved TOTP secret to derive 2FA codes (no prompt). |
| `--disable-totp` | Disable TOTP on the account. |
| `--no-cache` | Don't reuse cached cookies; force a fresh login. |
| `--action <name>` | Run a one-shot action: `send-message`, `send-reply`, `get-imaging`. |

The default invocation (no flags besides `--host`) logs in interactively
and dumps every scrape category to stdout. Useful as a smoke test.

The CLI stores credentials under `./.passkey-credentials/` and
`./.totp-secrets/` (both relative to the cwd). Override either with
`MYCHART_PASSKEY_DIR=/abs/path` or `MYCHART_TOTP_DIR=/abs/path`.

## Persisting sessions

Cookie-based sessions are short-lived (MyChart times them out after
~15 min of idle), but you can still skip a re-login between processes
by serializing the active session and rehydrating it later:

```ts
const json = await client.serialize();
await fs.writeFile('session.json', json);

// ...later, in another process
const restored = await MyChartClient.fromSerialized(await fs.readFile('session.json', 'utf8'));
if (await restored.isSessionValid()) {
  const meds = await restored.getMedications();
}
```

For longer-lived persistence (across sleep, across days), prefer the
passkey flow — re-running `connectWithPasskey` is fast and the
credential survives indefinitely as long as you re-save the mutated
copy after each login.

## Telemetry

This package sends anonymous usage events (think: Next.js / Vercel CLI
telemetry) so we can see which scrapers are actually exercised in the
wild and prioritize fixes accordingly.

What is collected:

- The event name (e.g. `scraper_login_started`) and the MyChart hostname
  the call targeted (the portal domain — not your machine's hostname).
- OS platform, architecture, OS version, and runtime version (e.g.
  `bun 1.3.9` or `node v22.11.0`).
- A stable random UUID generated once per project install and cached
  at `<your-project>/node_modules/.cache/mychart-cli/anonymous-id`
  (same convention Babel / ESLint / Webpack use). Used purely for
  dedupe. Never written outside `node_modules`. Cleared whenever you
  reinstall.

What is **not** collected: your public IP, OS hostname, OS username,
git config (`user.name` / `user.email`), or any data scraped from your
chart.

To disable telemetry entirely, set:

```bash
export MYCHART_CLI_TELEMETRY_DISABLED=1
```

## License

This package is distributed under a proprietary source-available license. See
[LICENSE](./LICENSE).
