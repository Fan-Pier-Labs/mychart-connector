# CLAUDE.md

## Project Overview

Health data aggregation platform that connects to Epic MyChart portals to scrape and consolidate a patient's medical records. Supports 30+ data categories. Ships a headless CLI mode, a Next.js web demo on AWS Fargate, and an MCP server for Claude AI integration.

## License

Proprietary source-available license (see `LICENSE`). Viewing and personal/educational use permitted; no commercial use, redistribution, SaaS offerings, or competing products without written permission from Fan Pier Labs. Modifications must be contributed back via PR.

## Architecture

- **Scrapers** (`scrapers/`): Shared scraper code for MyChart
- **CLI** (`cli/cli.ts`): Headless CLI entry point. Great for Claude code to use for testing changes in the cli or scrapers.
- **Shared types** (`shared/`): Common types and enums shared across packages
- **Read local passwords** (`read-local-passwords/`): Browser password store extraction (Chrome, Arc, Firefox)
- **CLO-to-JPG converter** (`scrapers/myChart/clo-to-jpg-converter/`): eUnity CLO image format converter
- **Web app** (`web/`): Next.js demo app deployed to AWS Fargate. Includes an mcp server. Uses BetterAuth for user authentication (email+password, Google OAuth) and PostgreSQL for storing encrypted MyChart credentials.
- **OpenClaw plugin** (`openclaw-plugin/`): Self-contained OpenClaw plugin that bundles all MyChart scrapers locally. No server dependency.
- **Fake MyChart** (`fake-mychart/`): Standalone Next.js app that mimics MyChart's API surface with Homer Simpson fake data. Used for development without real MyChart access and CI integration tests. Run with `cd fake-mychart && bun run dev` (port 4000). Credentials: `homer`/`donuts123` (or set `FAKE_MYCHART_ACCEPT_ANY=true`). All state lives in RAM. Supports the full login flow including 2FA (code `123456`).

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

## Reference Docs

- **[CLI reference](docs/cli.md)** — Cookie caching, credential resolution, 2FA, CLI actions
- **[Imaging scraper](docs/imaging.md)** — eUnity protocol, AMF3, instance-specific notes
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
- **Web app** (`web/`): Next.js app deployed to AWS Fargate via `bun run deploy_scraper_demo`
  - Uses the `deploy` package (dev dependency) which builds a Docker image, pushes to ECR, and deploys to ECS Fargate
  - Config: `web/deploy.yaml`
  - Domain: `mychart.fanpierlabs.com` (CloudFront + ALB + Route53)
  - Region: `us-east-2`

### Railway / Self-Hosted

- Config: `railway.toml` (Dockerfile-based build)
- Required env vars: `DATABASE_URL` (auto from Postgres plugin), `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY`, `NEXT_PUBLIC_BASE_URL`
- Optional env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Google OAuth disabled without them)
- SSL is disabled for Railway Postgres connections (not needed); AWS RDS uses `{ rejectUnauthorized: false }`

## Secrets (AWS Secrets Manager, us-east-2)

- **RESEND_API_KEY**: `arn:aws:secretsmanager:us-east-2:555985150976:secret:RESEND_API_KEY-vKJonO`
  - Used by CLI for autonomous 2FA code retrieval via Resend inbound emails
  - Inbound email address: `healthapp@bocuedpo.resend.app`
- **BETTER_AUTH_SECRET**: `arn:aws:secretsmanager:us-east-2:555985150976:secret:BETTER_AUTH_SECRET-ViBKHZ`
  - BetterAuth session signing secret, loaded automatically from Secrets Manager
- **BETTER_AUTH_URL**: Base URL for BetterAuth (defaults to `NEXT_PUBLIC_BASE_URL` or `http://localhost:3000`)
- **GOOGLE_CLIENT_ID** / **GOOGLE_CLIENT_SECRET**: Google OAuth credentials (optional, Google sign-in disabled without them)

## MyChart Login

- Login field auto-detection: `LoginIdentifier` vs `Username` — detected from `loginpagecontroller.min.js`
- `mychart.example.org` is the primary test target and often skips 2FA
- Fetch passwords from the browser keystore
- Do not ask the user for 2FA codes — retrieve them automatically via the Resend API (see [CLI docs](docs/cli.md#automatic-2fa-via-resend))
- Session expiration: a 302 redirect to the Login page means cookies are dead

## App Authentication & 2FA

BetterAuth handles email+password and Google OAuth sign-in. Two additional auth methods are supported:

- **Passkeys (WebAuthn)**: Users can register passkeys (Touch ID, Face ID, security keys) from the Security card on the home page. Sign-in with passkey is available on the login page.
- **TOTP 2FA (Authenticator App)**: Users can enable TOTP-based two-factor authentication from the Security card. When enabled, sign-in with email+password requires a 6-digit code from an authenticator app. Backup codes are provided during setup.

Key files:
- `web/src/lib/auth.ts` — Server config with `twoFactor()` and `passkey()` plugins
- `web/src/lib/auth-client.ts` — Client config with `twoFactorClient()` and `passkeyClient()` plugins
- `web/src/app/login/page.tsx` — Passkey sign-in button + TOTP verification step
- `web/src/app/home/page.tsx` — Security settings card (enable/disable TOTP, manage passkeys)

Database tables (`twoFactor`, `passkey`) are auto-created by `runMigrations()`.

Note: This is separate from MyChart portal TOTP (used for auto-connecting to health portals).

## MCP Server

The web app exposes a per-user MCP server at `/api/mcp?key={apiKey}` for Claude AI integration. Users generate a long-lived API key (SHA-256 hash stored in `user.mcp_api_key_hash`) via `POST /api/mcp-key`. One MCP URL works for all of a user's MyChart accounts — tools accept an optional `instance` parameter to target a specific hostname when multiple accounts are connected. Auto-connects TOTP-enabled instances on first tool call.

Key files:
- `web/src/lib/mcp/server.ts` — MCP server creation, tool registration (per-user)
- `web/src/lib/mcp/api-keys.ts` — API key generate/validate/revoke
- `web/src/lib/mcp/auto-connect.ts` — shared login+TOTP auto-connect logic
- `web/src/app/api/mcp/route.ts` — HTTP transport handler (authenticates via API key)
- `web/src/app/api/mcp-key/route.ts` — API key management endpoint

## OpenClaw Plugin

Self-contained plugin in `openclaw-plugin/` that bundles all MyChart scraper code locally (no server needed).

- **Build**: `cd openclaw-plugin && bun run build` (produces `dist/index.js` via tsup)
- **Install**: `openclaw plugins install -l ./openclaw-plugin`
- **Setup**: `openclaw mychart setup` — interactive credential config with optional browser password import and TOTP setup
- **Status**: `openclaw mychart status` — show current config
- **Reset**: `openclaw mychart reset` — clear saved credentials
- Registers 35+ tools (`mychart_get_profile`, `mychart_get_medications`, `mychart_send_message`, etc.)
- Auto-login via TOTP, session keepalive every 30s, automatic re-login on expiry
- Key source files: `src/index.ts` (entry), `src/session.ts` (login/keepalive), `src/tools.ts` (tool registration), `src/setup.ts` (CLI), `src/config.ts` (credentials), `src/password-import.ts` (browser import)

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

## Scraping Tips

When reverse engineering health portal APIs (MyChart, etc.), the request headers must **exactly match** what the browser sends — including header name casing (lowercase), `origin` header, `user-agent` string version, and `x-clientversion`. A missing `origin` header alone causes a 403 Forbidden. Use Playwright MCP to capture the exact request the browser makes, then replicate it exactly in the scraper code. 

## Tools

- **Playwright MCP** is the preferred tool for exploring websites, reverse engineering APIs, and understanding web app behavior. Always use the Playwright MCP tools (browser_navigate, browser_snapshot, browser_click, browser_network_requests, etc.) rather than writing one-off TypeScript scripts that import Playwright directly. The MCP gives you an interactive browser session that's far more efficient for investigation and debugging.

## Rules

- **NEVER modify or delete anything from the macOS Keychain or the browser keychain.** Read-only access is OK.
- **NEVER use `git stash`.** If you're considering stashing changes, stop and ask the user first.
- **NEVER upload PII to git or GitHub.** Before committing, review all staged changes to ensure no personally identifiable information (names, emails, phone numbers, addresses, dates of birth, medical record numbers, patient IDs, health data, credentials, API keys, or any other sensitive data) is included. If PII is found in code, test fixtures, logs, or output files, remove or redact it before committing.
- **Always update this CLAUDE.md when adding new features** — document new CLI flags, scrapers, configuration, or architectural changes so this file stays current.

## Workflow

- Always create a PR for new features — never push directly to `main`
- CI must pass (lint, tests, build) before merging
- **NEVER merge pull requests or enable auto merge without the user's explicit permission.** Wait for the user to explicitly tell you to do so.
- Make sure to write tests as well. Unit, and integration when appropriate. 

### Creating / Updating PRs

- `gh pr edit` fails due to a GitHub Projects Classic deprecation error. Use the GitHub API directly instead:
  ```bash
  gh api repos/Fan-Pier-Labs/ryans-health-app/pulls/<PR_NUMBER> -X PATCH \
    -f title="PR title" \
    -f body="PR body"
  ```
- To create a PR, use `gh pr create` as normal. If a PR already exists for the branch, update it with the API method above.
