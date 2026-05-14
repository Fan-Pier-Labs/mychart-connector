# CLAUDE.md

## Project Overview

Health data aggregation platform that connects to Epic MyChart portals to scrape and consolidate a patient's medical records. Supports 30+ data categories. Ships a headless CLI mode, a Next.js web demo on AWS Fargate, and an MCP server for Claude AI integration.

## License

Proprietary source-available license (see `LICENSE`). Viewing and personal/educational use permitted; no commercial use, redistribution, SaaS offerings, or competing products without written permission from Fan Pier Labs. Modifications must be contributed back via PR.

## Architecture

- **Scrapers** (`scrapers/`): Shared scraper code for MyChart
- **CLI** (`npm-package/cli/cli.ts`): Headless CLI entry point — bundled into the published `mychart-cli` npm package as the `mychart-cli` bin. `npm i -g mychart-cli` puts `mychart-cli` on PATH. Great for Claude code to use for testing changes in the cli or scrapers.
- **Shared types** (`shared/`): Common types and enums shared across packages
- **Read local passwords** (`read-local-passwords/`): Browser password store extraction (Chrome, Arc, Firefox)
- **CLO image parser** (`scrapers/myChart/clo-image-parser/`): eUnity CLO image format decoder and encoder
- **Web app** (`web/`): Next.js demo app deployed to AWS Fargate. Includes an mcp server. Uses BetterAuth for user authentication (email+password, Google OAuth) and PostgreSQL for storing encrypted MyChart credentials.
- **OpenRecord plugin** (`openclaw-plugin/`): Self-contained OpenClaw plugin (package name: `openrecord`) that bundles all MyChart scrapers locally. No server dependency.
- **Fake MyChart** (`fake-mychart/`): Standalone Next.js app that mimics MyChart's API surface with Homer Simpson fake data. Used for development without real MyChart access and CI integration tests. Run with `cd fake-mychart && bun run dev` (port 4000). Credentials: `homer`/`donuts123` (no 2FA) or `marge`/`donuts123` (TOTP enabled — always requires the 2FA code `123456`). Set `FAKE_MYCHART_ACCEPT_ANY=true` to accept any username/password. All state lives in RAM. Visit `/reset` (or `POST /reset`) to wipe all in-memory state — sessions, sent messages, emergency contacts, per-user TOTP/passkeys, booked appointments — back to the seed.

## Key Commands

- `bun run lint` — Run ESLint
- `bun run test` — Run unit tests + web tests
- `bun run test:unit` — Run scraper unit tests only
- `bun run test:integration` — Run integration tests (requires credentials)
- `bun run cli` — Run the CLI scraper (defaults to MyChart)
- `bun run cli mychart [flags]` — MyChart scraper
- `cd fake-mychart && bun run dev` — Run fake MyChart server on port 4000
- `cd fake-mychart && bun run build` — Build fake MyChart for production
- `bun run web/scripts/migrate.ts` — Run database migrations (BetterAuth tables + mychart_instances)
- `bun run test:ci-integration` — Run CI integration tests (requires Docker Compose services running)
- `docker compose -f docker-compose.ci.yaml up -d --build --wait` — Start CI services (PostgreSQL 18, fake-mychart, web app)
- `docker compose -f docker-compose.ci.yaml down -v` — Tear down CI services

## CI Integration Tests

End-to-end tests in `tests/integration/ci/` that exercise the full user journey against Docker Compose services. Uses `docker-compose.ci.yaml` to spin up PostgreSQL 18, fake-mychart, and the web app.

**Single test file** (`tests/integration/ci/integration.test.ts`) runs all scenarios sequentially to maintain shared state (session cookies, instance IDs). Covers:
1. Health check canary
2. Sign up, sign in, sign out
3. MyChart instance CRUD, connect, login flow
4. Full 30-category data scrape with Homer Simpson spot-checks
5. MCP API key generate/revoke lifecycle
6. Notification preference CRUD
7. App-level TOTP 2FA enable/verify/sign-in/disable
8. Password reset request, token validation, password change, old password rejection
9. Passkey setup on MyChart instance and passkey auto-login
10. MyChart instance deletion and cleanup

**Protocol detection**: Hostnames without a dot (e.g. Docker service names like `fake-mychart:3000`) automatically use HTTP instead of HTTPS.

**Database access**: PostgreSQL is exposed on host port 5433 (mapped from container port 5432) so integration tests can query the DB directly (e.g., to extract password reset tokens from the `verification` table). Connection string: `postgresql://testuser:testpass@localhost:5433/mychart_test` (override with `CI_DATABASE_URL` env var).

## Reference Docs

- **[CLI reference](docs/cli.md)** — Cookie caching, credential resolution, 2FA, CLI actions
- **[Imaging scraper](docs/imaging.md)** — eUnity protocol, AMF3, instance-specific notes
- **[Scraping guide](docs/scraping.md)** — MyChart login, scraping tips, and tooling
- **[OpenRecord plugin](docs/openclaw.md)** — Build, install, setup, and tool registration
- **[Deployment details](docs/deployment.md)** — Additional infrastructure notes
- **[MyChart features](MYCHART_FEATURES.md)** — Full inventory of MyChart features and scraper coverage
- **[MyChart TOTP](docs/mychart-totp.md)** — TOTP authenticator app 2FA setup, API endpoints, CLI flags
- **[Self-hosting](SELF_HOSTING.md)** — Run locally with PostgreSQL, ngrok/Cloudflare Tunnel, and env-var config

## Deployment

The web app supports two deployment modes, auto-detected via the `DATABASE_URL` env var:

- **If `DATABASE_URL` is set** → env-var mode (Railway / self-hosted). All config comes from env vars.
- **If `DATABASE_URL` is not set** → AWS mode (Fargate). Config comes from AWS Secrets Manager.

### AWS Fargate (primary)

- **AWS account**: fanpierlabs (`aws --profile fanpierlabs`)
- **Web app** (`web/`): Next.js app deployed to AWS Fargate via `bun run deploy` (from repo root, uses `web/deploy.yaml`)
  - Uses the `deploy` package (dev dependency) which builds a Docker image, pushes to ECR, and deploys to ECS Fargate
  - Config: `web/deploy.yaml`
  - Domain: `openrecord.fanpierlabs.com` (CloudFront + ALB + Route53). Old domain `mychart.fanpierlabs.com` redirects via next.config.ts.
  - Region: `us-east-2`
- **Fake MyChart** (`fake-mychart/`): Separate Fargate app deployed independently from the web app. **Run the deploy script from inside `fake-mychart/`** so the relative `Dockerfile` path resolves to `fake-mychart/Dockerfile` (not the repo-root web app Dockerfile):
  - `cd fake-mychart && python3 ../node_modules/deploy/main.py --config deploy.yaml`
  - Config: `fake-mychart/deploy.yaml`
  - Domain: `fake-mychart.fanpierlabs.com` (its own ALB + ECS service `fake-mychart-service` in cluster `fake-mychart-cluster`)
  - Region: `us-east-2`

### Railway / Self-Hosted

- Config: `railway.toml` (Dockerfile-based build)
- Required env vars: `DATABASE_URL` (auto from Postgres plugin), `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY`
- Railway deployments work zero-config: `*.up.railway.app` is always trusted. Set `BETTER_AUTH_URL` only if using a custom domain.
- Optional env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Google OAuth disabled without them)
- SSL is enabled by default for all Postgres connections (Railway and AWS). Set `DB_SSL=false` only for local dev with a plain Postgres container. AWS RDS uses full certificate verification (`rejectUnauthorized: true`) with the committed CA bundle at `web/certs/rds-global-bundle.pem`. Railway uses `rejectUnauthorized: false` (self-signed certs).

## S3 Buckets (us-east-2)

- **mychart-connector** (`arn:aws:s3:::mychart-connector`)
  - `mychart-logos/` — logos for all MyChart instances, uploaded by `scrapers/list-all-mycharts/fetch-mychart-instances.ts`
  - Served via `GET /api/mychart-logo?name=<filename>`

## Secrets (AWS Secrets Manager, us-east-2)

- **RESEND_API_KEY**: `arn:aws:secretsmanager:us-east-2:555985150976:secret:RESEND_API_KEY-vKJonO`
  - Used by CLI for autonomous 2FA code retrieval via Resend inbound emails
  - Inbound email address: `healthapp@bocuedpo.resend.app`
- **BETTER_AUTH_SECRET**: `arn:aws:secretsmanager:us-east-2:555985150976:secret:BETTER_AUTH_SECRET-ViBKHZ`
  - BetterAuth session signing secret, loaded automatically from Secrets Manager
- **BETTER_AUTH_URL**: Base URL for BetterAuth (defaults to `RAILWAY_PUBLIC_DOMAIN` or `http://localhost:3000`)
- **GOOGLE_CLIENT_ID** / **GOOGLE_CLIENT_SECRET**: Google OAuth credentials (optional, Google sign-in disabled without them)
- **SENTRY_AUTH_TOKEN**: `arn:aws:secretsmanager:us-east-2:555985150976:secret:mychart-connector-sentry-auth-token-UputCa`
  - Sentry auth token for error monitoring and source map uploads
- **GEMINI_API_KEY**: `arn:aws:secretsmanager:us-east-2:555985150976:secret:GEMINI_API_KEY-GPbdf6`
  - Google Gemini API key for the AI proxy. Can also be set via `GEMINI_API_KEY` env var in env-var mode.
- **EXPO_TOKEN**: `arn:aws:secretsmanager:us-east-2:555985150976:secret:EXPO_TOKEN-XYwf9T`
  - Expo access token for EAS CLI builds and TestFlight submissions. Used with `EXPO_TOKEN` env var.
- **APPLE_CREDENTIALS**: `arn:aws:secretsmanager:us-east-2:555985150976:secret:APPLE_CREDENTIALS-GZhHoo`
  - Apple Developer credentials (appleId, appleTeamId) for iOS builds and App Store submissions.
- **APPLE_APP_SPECIFIC_PASSWORD** (ryanhughes624): `arn:aws:secretsmanager:us-east-2:066949051862:secret:APPLE_APP_SPECIFIC_PASSWORD-fZNTNC`
  - Apple app-specific password for App Store Connect / TestFlight CLI uploads (ryan@fanpierlabs.com).

## App Authentication & 2FA

BetterAuth handles email+password and Google OAuth sign-in. Two additional auth methods are supported:

- **Passkeys (WebAuthn)**: Users can register passkeys (Touch ID, Face ID, security keys) from the Security card on the home page. Sign-in with passkey is available on the login page.
- **TOTP 2FA (Authenticator App)**: Users can enable TOTP-based two-factor authentication from the Security card. When enabled, sign-in with email+password requires a 6-digit code from an authenticator app. Backup codes are provided during setup.
- **Password Reset**: Users can reset their password via email. The flow: `/forgot-password` (enter email) → receive reset email via Resend → `/reset-password?token=...` (enter new password). Uses BetterAuth's built-in `forgetPassword`/`resetPassword` APIs.

Key files:
- `web/src/lib/auth.ts` — Server config with `twoFactor()` and `passkey()` plugins, `sendResetPassword` email handler
- `web/src/lib/auth-client.ts` — Client config with `twoFactorClient()` and `passkeyClient()` plugins
- `web/src/lib/email.ts` — Shared transactional email utility (Resend). Supports both AWS Secrets Manager and `RESEND_API_KEY` env var
- `web/src/app/login/page.tsx` — Passkey sign-in button + TOTP verification step + "Forgot password?" link
- `web/src/app/forgot-password/page.tsx` — Request password reset email
- `web/src/app/reset-password/page.tsx` — Set new password with reset token
- `web/src/app/home/page.tsx` — Security settings card (enable/disable TOTP, manage passkeys)

Database tables (`twoFactor`, `passkey`) are auto-created by `runMigrations()`.

Note: This is separate from MyChart portal TOTP (used for auto-connecting to health portals).

## MCP Server

The web app exposes a per-user MCP server at `/api/mcp?key={apiKey}` for Claude AI integration. Users generate a long-lived API key (SHA-256 hash stored in `user.mcp_api_key_hash`) via `POST /api/mcp-key`. One MCP URL works for all of a user's MyChart accounts — tools accept an optional `instance` parameter to target a specific hostname when multiple accounts are connected. Auto-connects TOTP-enabled instances on first tool call.

Write tools include `send_message`, `send_reply`, `request_refill`, `book_appointment`, `get_available_appointments`, and emergency contact management (`add_emergency_contact`, `update_emergency_contact`, `remove_emergency_contact`). Appointment booking (`get_available_appointments`, `book_appointment`) is a placeholder in production (returns "coming soon" error) but fully functional in the demo server.

A public demo MCP endpoint at `/api/mcp/demo` requires no authentication and returns fictional Homer Simpson data. The demo server mirrors all production tools exactly with fake responses.

Key files:
- `web/src/lib/mcp/server.ts` — MCP server creation, tool registration (per-user)
- `web/src/lib/mcp/demo-server.ts` — Demo MCP server with fake Homer Simpson data
- `web/src/lib/mcp/demo-data.ts` — All fictional demo data (profile, meds, appointments, etc.)
- `web/src/lib/mcp/api-keys.ts` — API key generate/validate/revoke
- `web/src/lib/mcp/auto-connect.ts` — shared login+TOTP auto-connect logic
- `web/src/app/api/mcp/route.ts` — HTTP transport handler (authenticates via API key)
- `web/src/app/api/mcp/demo/route.ts` — Demo MCP endpoint (no auth required)
- `web/src/app/api/mcp-key/route.ts` — API key management endpoint

## AI Proxy

Server-side AI proxy at `POST /api/ai` that forwards requests to Gemini (currently Gemini 2.5 Flash). Designed with a provider abstraction (`AiProvider` interface) so the backend can be swapped without changing the API contract.

- **Per-user spending limit**: $50/month tracked via `ai_spend_cents` and `ai_spend_period` columns on the `user` table. Period resets automatically on calendar month boundaries.
- **Usage endpoint**: `GET /api/ai` returns current spend info (spentCents, limitCents, remainingCents, period).
- **Auth**: Session-based (same as other protected routes via `requireAuth`).

Key files:
- `web/src/lib/ai/types.ts` — Provider-agnostic types (`AiProvider`, `AiMessage`, `AiRequest`, `AiResponse`)
- `web/src/lib/ai/gemini.ts` — Gemini provider implementation (swap this to change providers)
- `web/src/lib/ai/usage.ts` — Per-user spending tracking and limit enforcement
- `web/src/app/api/ai/route.ts` — API route (POST for chat, GET for spend info)

## Notification System

Daily email notifications when MyChart account changes are detected. Users opt in via the home page UI.

- **Preferences**: Per-user `notifications_enabled` and `notifications_include_content` columns on the `user` table
- **Tracking**: `notifications_last_checked_at` on `mychart_instances` — timestamp of last check per instance
- **Change detection**: Checks 10 categories (messages, lab results, imaging, medications, letters, visits, activity feed, documents, allergies, health issues) using timestamp comparison
- **Email modes**: Summary (category counts + login link) or detailed (actual medical content + X-ray JPEGs as attachments)
- **Imaging pipeline**: Downloads CLO images via `downloadImagingStudyDirect()`, converts to JPEG via `convertCloToJpg()`, attaches to email (max 5)
- **Orchestration**: `startNotificationChecker()` in `instrumentation.ts` runs on server startup, then every 24 hours
- **First run**: When `notifications_last_checked_at` is NULL, sets baseline without sending email

Key files:
- `web/src/lib/notifications/change-detector.ts` — Timestamp-based change detection across 10 scrapers
- `web/src/lib/notifications/check.ts` — Orchestrator (checkAllUsers, startNotificationChecker)
- `web/src/lib/notifications/email.ts` — Resend email sending
- `web/src/lib/notifications/imaging.ts` — X-ray CLO→JPEG for email attachments
- `web/src/lib/notifications/templates.ts` — HTML email templates (summary + detailed)
- `web/src/app/api/notifications/preferences/route.ts` — GET/PUT user preferences

## Memory

You maintain persistent memory in markdown files at `claude-memory/` in the repo root. This replaces the built-in auto-memory feature (which is disabled for this project).

### How it works
- **`claude-memory/MEMORY.md`** is your main memory file — read it at the start of every conversation to build on prior context.
- Create separate topic files (e.g., `claude-memory/debugging.md`, `claude-memory/patterns.md`) for detailed notes and reference them from MEMORY.md.
- Use Edit/Write tools to update memory files as you learn new things.

### When to save
- Stable patterns and conventions confirmed across multiple interactions
- Key architectural decisions, important file paths, and project structure changes
- User preferences for workflow, tools, and communication style
- Solutions to recurring problems and debugging insights
- When the user explicitly asks you to remember something

### When NOT to save
- **NEVER save PII** (personally identifiable information) — no names, emails, phone numbers, addresses, dates of birth, medical record numbers, patient IDs, health data, or credentials
- Session-specific context (current task details, in-progress work, temporary state)
- Information that might be incomplete — verify before writing
- Anything that duplicates existing CLAUDE.md content
- Speculative or unverified conclusions from reading a single file

### Rules
- Always check existing memory files before writing to avoid duplicates
- Update or remove memories that turn out to be wrong or outdated
- Keep MEMORY.md concise — use separate files for detailed notes
- Organize by topic, not chronologically

## iOS Simulator Debugging & UI Automation

Use **`maestro-cli`** (already installed at `~/.local/bin/maestro-cli`) for every interaction with the iOS simulator. It's a one-shot wrapper around Maestro (mobile.dev) designed for agent loops — each invocation does one action and writes a screenshot to `/tmp/maestro-last.png` so the next step can read it.

**Hard rules (no exceptions):**
- **NEVER take over the user's mouse.** Do not use `cliclick`, `osascript ... click at`, AppleScript mouse events, AppKit/CGEvent, or any other tool that moves the cursor or steals focus. The user may be using their computer.
- **NEVER click on the simulator by computing pixel coordinates against the simulator window position.** It's brittle, focus-races with whatever the user is doing, and breaks on every window move or sim resize. Use `maestro-cli` instead — it talks to the simulator through iOS's native automation hooks, not the macOS cursor.
- **Do not install a separate Maestro.** The brew `maestro` cask is a different product (runmaestro.ai). The mobile.dev Maestro CLI is what `maestro-cli` wraps and it's already on PATH.

### Starting a sim session (do this exactly once per Claude session)

Every Claude session that touches the simulator must own a fresh, dedicated sim — never share one with another running Claude. The recipe:

```bash
# 1. Create a new simulator. simctl assigns a UDID and prints it.
UDID=$(xcrun simctl create "claude-$(date +%Y%m%d)-$(openssl rand -hex 3)" \
  "iPhone 17" \
  "com.apple.CoreSimulator.SimRuntime.iOS-26-1")

# 2. Boot it and surface the Simulator.app window so the user can watch.
xcrun simctl boot "$UDID"
open -a Simulator

# 3. Pin the UDID for the rest of the session. The Bash tool's shell state
#    persists across tool calls, so this one export is enough — every later
#    maestro-cli invocation picks it up automatically.
export MAESTRO_UDID="$UDID"

# 4. Build + install + launch the Expo app on this exact sim.
cd expo-app && bunx expo run:ios --device "$UDID" --port 8083 &
```

Notes:
- The UDID is CoreSimulator-assigned, not Claude-generated. Capture it from `simctl create`'s stdout.
- Naming pattern `claude-<date>-<random>` makes orphaned sims easy to spot and bulk-delete: `xcrun simctl delete $(xcrun simctl list devices | grep -E 'claude-[0-9]{8}-' | grep -oE '[A-F0-9-]{36}')`.
- Use a port other than 8081 if other Claude instances are running their own Metro on the default port. Pick deterministically (8082, 8083, …) and pass `--port` to `expo run:ios`.
- At end of session: `xcrun simctl shutdown "$MAESTRO_UDID" && xcrun simctl delete "$MAESTRO_UDID"`. Leave it running only if the user explicitly wants to keep it.

**Common commands** (full reference: `maestro-cli --help`):

```
maestro-cli tap "Get Started"         # tap by visible text or regex
maestro-cli tap-id run-skill-button   # tap by testID — preferred when set
maestro-cli type "homer"              # type into focused field
maestro-cli fill "Username" "homer"   # tap a field by label, then type
maestro-cli press Enter               # hardware/keyboard key
maestro-cli scroll down               # screen scroll
maestro-cli wait "Run a skill"        # block until text appears
maestro-cli assert-visible "Insights" # fail if missing
maestro-cli screenshot [path]         # /tmp/maestro-last.png by default
maestro-cli hierarchy                 # dump a11y tree (great for finding testIDs)
maestro-cli launch / stop             # relaunch / terminate app
maestro-cli reset-keychain            # wipe sim keychain (forgets logins/setup_complete)
```

Env vars:
- `MAESTRO_APP_ID` — bundle id (default `com.fanpierlabs.openrecord`).
- `MAESTRO_UDID` — **REQUIRED.** iOS simulator UDID. `maestro-cli` will exit non-zero immediately if this is unset. There's no fallback, on purpose — multiple Claude sessions run in parallel and a default would let one agent silently drive another agent's sim.

Find UDIDs with `xcrun simctl list devices booted`. Then either:

```
export MAESTRO_UDID=4C4A3949-7F06-4335-BFE4-DBBB8B183DFD  # session-wide
maestro-cli tap "Get Started"
```

or pass per-command:

```
MAESTRO_UDID=4C4A3949-… maestro-cli tap "Get Started"
```

**Every interactive element in the Expo app MUST have a testID so `maestro-cli tap-id` works deterministically.**

- React Native: set `testID` AND `accessibilityLabel` on every `Pressable`, `Button`, `TextInput`, `Switch`, and tappable `View`. `testID` is the primary handle for Maestro; `accessibilityLabel` is what VoiceOver reads (also a fallback for `maestro-cli tap` by text).
- Use a stable, kebab- or snake-case `testID` that describes what the element does, not where it sits. Examples: `get-started-button`, `onboarding-continue`, `skill-bill_itemization`, `chat-input`, `send-message`.
- For lists of items (chats, insights, skills), include the row id in the `testID` (e.g. `chat-row-${chatId}`) so flows can target a specific row.
- When you add a new screen or button as part of a feature, add the `testID` in the same diff. PRs that introduce new untargetable UI should be rejected at review.

## Rules

- **NEVER modify or delete anything from the macOS Keychain or the browser keychain.** Read-only access is OK.
- **NEVER make changes in AWS without explicit user direction.** No `aws ... create-*`, `delete-*`, `update-*`, `put-*`, ECS service updates, ALB/target-group/listener changes, IAM edits, Secrets Manager writes, RDS modifications, S3 deletes, CloudFront invalidations, etc. Read-only AWS calls (`describe-*`, `list-*`, `get-*`, `sts get-caller-identity`) are fine. Running the official deploy scripts (`bun run deploy` for the web app, `cd fake-mychart && python3 ../node_modules/deploy/main.py --config deploy.yaml` for fake-mychart) is also fine when the user has asked you to deploy. If a deploy script fails partway and leaves orphan/inconsistent AWS resources, **stop and ask** before cleaning them up.
- **NEVER use `git stash`.** If you're considering stashing changes, stop and ask the user first.
- **NEVER upload PII to git or GitHub.** Before committing, review all staged changes to ensure no personally identifiable information (names, emails, phone numbers, addresses, dates of birth, medical record numbers, patient IDs, health data, credentials, API keys, or any other sensitive data) is included. If PII is found in code, test fixtures, logs, or output files, remove or redact it before committing. **Body parts, diagnoses, procedures, dates of medical events, and medical details extracted from real patient data also count as PII** — do not include specific body parts (e.g., "shoulder"), procedure names (e.g., "arthrogram"), series descriptions from real imaging studies, or when specific scans/procedures were performed (e.g., "MRI was done on 1/1") in commit messages, PR descriptions, documentation examples, or code comments. Use generic examples instead.
- **NEVER use `dangerouslySetInnerHTML`.** All HTML from external sources (MyChart API responses, scraped content) must be sanitized with DOMPurify before rendering. Use the `SafeHtml` component from `web/src/components/SafeHtml.tsx` which wraps the `sanitizeHtml()` utility. This is a health data app — XSS is unacceptable.
- **Always update this CLAUDE.md when adding new features** — document new CLI flags, scrapers, configuration, or architectural changes so this file stays current.

## Workflow

- Always create a PR for new features — never push directly to `main`
- CI must pass (lint, tests, build) before merging
- **NEVER merge pull requests or enable auto merge without the user's explicit permission.** Wait for the user to explicitly tell you to do so.
- **Always write tests for all changes.** Unit tests for scraper/utility logic, and integration tests (in `tests/integration/ci/integration.test.ts`) for web app features and API endpoints. No PR should be submitted without corresponding test coverage.
- **Run the web app for the user to test.** When web app changes are ready for review, start the dev server on a random local port (use `python3 -c "import random; print(random.randint(3100, 3999))"` to pick the port, then `cd web && PORT=<port> bun run dev`). Share the URL so the user can test in the browser.

### Creating / Updating PRs

- `gh pr edit` fails due to a GitHub Projects Classic deprecation error. Use the GitHub API directly instead:
  ```bash
  gh api repos/Fan-Pier-Labs/ryans-health-app/pulls/<PR_NUMBER> -X PATCH \
    -f title="PR title" \
    -f body="PR body"
  ```
- To create a PR, use `gh pr create` as normal. If a PR already exists for the branch, update it with the API method above.

### Maestro UI automation (one-step pattern)

When driving the iOS simulator (or any device) with Maestro, **do NOT write multi-step YAML files** that try to script the entire flow up front. Each rerun replays every prior step from the beginning, which is slow, error-prone, and bad at recovering when the UI is in an unexpected state.

**Use `maestro-cli` (one-shot wrapper).** A small bash wrapper at `~/.local/bin/maestro-cli` does one Maestro action per call, so each step is a single shell command — no YAML file to write or read. After every action it auto-saves a screenshot to `/tmp/maestro-last.png` so the next prompt can read the result with the `Read` tool.

```bash
maestro-cli tap "Get Started"                       # tap by visible text / accessibilityLabel
maestro-cli tap-id "google-continue"                # tap by accessibilityIdentifier (RN testID), regex
maestro-cli tap-id ".*Springfield.*"                # regex match on testID
maestro-cli tap-xy 200 480                          # tap at pixel coordinates
maestro-cli fill "Username" "homer"                 # tap a field then type
maestro-cli type "homer"                            # type into focused field
maestro-cli hide-keyboard                           # dismiss soft keyboard
maestro-cli press Enter                             # press a hardware/keyboard key
maestro-cli back                                    # system back / swipe-back
maestro-cli swipe-up   |  maestro-cli swipe-down    # gestures
maestro-cli wait "Welcome"                          # extendedWaitUntil (default 10s)
maestro-cli assert-visible "Find your provider"
maestro-cli launch  |  maestro-cli stop             # relaunch / kill the app
maestro-cli screenshot [/path/out.png]              # explicit screenshot
maestro-cli hierarchy                               # dump accessibility tree (find testIDs)
maestro-cli reset-keychain                          # wipe sim keychain (forgets all logins)
```

After each command the screenshot lives at `/tmp/maestro-last.png`. Read it with the `Read` tool to evaluate the new state, then decide the next action.

Env knobs: `MAESTRO_APP_ID` (default `com.fanpierlabs.openrecord`), `MAESTRO_UDID` (default the dev sim), `MAESTRO_QUIET=1` (silence Maestro output), `MAESTRO_NO_SCREENSHOT=1` (skip auto-screenshot), `MAESTRO_SCREENSHOT=/path` (override path).

**Add `testID` props to interactive elements.** All `Pressable`, `Button`, and `TextInput` components in onboarding/settings/chat should carry a stable `testID` so Maestro can target them by ID even when the visible text changes. Use kebab-case names (`google-continue`, `mychart-signin`, `picker-item-${name}`). Maestro's `tap-id` selector is a regex over `accessibilityIdentifier` (which is what RN's `testID` maps to on iOS), so values containing regex metacharacters (parens, brackets) need either escaping or a wildcard match (`.*Springfield.*`).

The simulator UDID for this machine is currently `3276F6D9-0713-48EC-91A0-E34FBB27F0C8` (iOS 26.4).
