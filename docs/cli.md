# CLI Reference

Headless CLI entry point at `cli/cli.ts`. Run with `bun run cli` or `NODE_ENV=development bun cli/cli.ts`.

## Cookie Caching

The CLI caches serialized MyChart sessions to `.cookie-cache/<hostname>.json` after a successful login. On subsequent runs it loads the cache and validates cookies with `areCookiesValid()` — if still valid, login and 2FA are skipped entirely.

- Cache dir: `.cookie-cache/` (gitignored, project root)
- `--no-cache` flag: skips loading cached cookies (still saves after login)
- Implementation: `tryLoadCachedSession()` / `saveCachedSession()` in `cli/cli.ts`
- Uses `MyChartRequest.serialize()` / `unserialize()` from `scrapers/myChart/myChartRequest.ts`

## Credential Resolution

- `--host <hostname>` — auto-discovers credentials from browser password stores (Chrome, Arc, Firefox)
- `--host <hostname> --user <u> --pass <p>` — uses provided credentials
- `--read-login-from-browser` — explicitly scan browser password stores for credentials (works with or without `--host`)
- `--2fa <code>` — provides a 2FA code for non-interactive use

## Automatic 2FA via Resend

When 2FA is required and no `--2fa` code is provided, the CLI automatically retrieves the 2FA code from Resend's inbound email API. The user's MyChart verification emails are forwarded to `healthapp@bocuedpo.resend.app`, and the CLI polls Resend's inbound email API (`resend.emails.receiving.list()` / `.get()`) for up to 60 seconds to find a 6-digit code.

**How it works** (`cli/resend/resend.ts`):
1. Fetches the Resend API key from AWS Secrets Manager (`RESEND_API_KEY` ARN)
2. Lists inbound emails via `resend.emails.receiving.list()`
3. For each email newer than the cutoff time, fetches full body via `.get(id)`
4. Extracts 6-digit codes with regex, scores them by domain match to the MyChart hostname
5. Returns highest-scoring codes sorted by score then recency

**Important**: The AWS Secrets Manager client uses the `fanpierlabs` profile only when `NODE_ENV=development`. When running the CLI locally, always set:
```bash
NODE_ENV=development bun cli/cli.ts --host <hostname> --read-login-from-browser --action get-imaging
```

Implementation files: `cli/resend/resend.ts` (new, used by CLI) and `cli/resend/get2fa.ts` (legacy).

## Subcommands

The CLI supports subcommands for different health portals:

- `bun run cli mychart [flags]` — MyChart scraper (default if no subcommand)

When no subcommand is given, the CLI defaults to MyChart behavior.

## CLI Actions (MyChart)

By default (no `--action` flag), the CLI scrapes all 30+ data categories in parallel. Specific actions:

- `--action send-message` — Send a new message to a care team provider
- `--action send-reply --conversation-id <id> --message <text>` — Reply to an existing conversation
- `--action delete-message --conversation-id <id>` — Delete a message/conversation
- `--action request-refill` — Request a medication refill
- `--action get-imaging` — Download imaging results (X-ray, MRI, CT, etc.) with report text, FDI context, and SAML viewer URLs
- `--action get-thread --conversation-id <id>` — Get full message thread details
- `--action keep-alive-test` — Ping /Home every 5 minutes to keep session alive; runs forever, prints status each ping

## Passkey Authentication

The CLI supports WebAuthn passkey authentication for passwordless login to MyChart portals.

- `--set-up-passkey` — Register a new passkey on the MyChart account (requires username/password for initial setup)
- `--use-passkey` — Log in using a saved passkey (no password needed)
- Auto-discovery: when `--host` is provided without credentials, the CLI checks for a saved passkey before falling back to browser password stores

Passkey credentials are stored in `.passkey-credentials/<hostname>.json` (gitignored). Each file contains the credential ID, private key, RP ID, user handle, and sign count.

### Sign Count

The WebAuthn sign count is critical for passkey authentication. The server tracks how many times a passkey has been used and rejects assertions with a sign count lower than or equal to its stored value. If a passkey is used from multiple sessions without the credential file being updated (e.g., copied to a different machine), the server-side counter will be higher than the local file's `signCount`, causing login to fail.

**If passkey login fails unexpectedly**, check the `signCount` in the credential file. If it's lower than the actual number of times the passkey has been used, manually increment it to a value higher than the server's counter (e.g., set it to 100). The CLI automatically increments and saves the updated sign count after each successful login.
