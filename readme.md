# OpenRecord

**Let AI manage your healthcare.** Ask Claude to request a prescription refill, message your doctor to schedule an appointment, review your latest lab results, or update your insurance information — all through a natural conversation. OpenRecord connects to MyChart and exposes 35+ tools through the [Model Context Protocol (MCP)](https://modelcontextprotocol.io). Unlike other health MCP servers that only let you read your data, OpenRecord has full write support — send messages, request refills, and update your insurance information, not just view it.

The project is **open source** and designed to run on your own infrastructure. Deploy your own instance to [Railway](https://railway.com) with one click — it provisions a database, generates secrets, and runs migrations automatically. You'll have a fully functional MCP server in under 3 minutes with zero configuration.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/5F69Mf?referralCode=xrxOUg)

Or try the hosted version at [openrecord.fanpierlabs.com](https://openrecord.fanpierlabs.com).

## What It Does

Connects to any Epic MyChart patient portal and exposes 35+ tools for reading and managing your health data:

- **Profile** — name, DOB, MRN, PCP, email
- **Medications** — current meds, dosages, refill details, pharmacy info
- **Lab Results** — test results, reference ranges, trending
- **Imaging** — X-ray, MRI, CT, ultrasound results
- **Allergies** — known allergies with severity and reactions
- **Health Issues** — active diagnoses and conditions
- **Vitals** — weight, blood pressure, height, BMI
- **Immunizations** — vaccine records and dates
- **Visits** — upcoming appointments and past visit history
- **Messages** — read, send, and reply to provider messages
- **Billing** — billing history and account balances
- **Care Team** — providers, specialists, departments
- **Insurance** — coverage details and plan info
- **Preventive Care** — overdue screenings and recommendations
- **Referrals** — active and past referrals
- **Medical History** — past conditions, surgical, family, and social history
- **Letters** — after-visit summaries and clinical letters
- **Documents** — clinical documents and visit records
- **And more** — emergency contacts, goals, care journeys, questionnaires, education materials, EHI export, linked accounts, medication refill requests

## How It Works

OpenRecord logs in with your credentials, handles 2FA automatically (via TOTP authenticator codes), and interacts with MyChart's APIs on your behalf. No FHIR, no OAuth, no Epic developer account needed — just your MyChart username, password, and optionally a TOTP secret for automatic 2FA.

Sessions are kept alive automatically and re-established on expiry.

## Demo MCP Server

Try the MCP server with fake patient data — no account or API key required.

**Demo URL:** `https://openrecord.fanpierlabs.com/api/mcp/demo`

The demo server exposes the same 35+ tools as the real MCP server (medications, lab results, vitals, messages, etc.) but returns fictional data for a sample patient. All meta tools (list_accounts, connect_instance, check_session, complete_2fa) work as well — they just return pre-connected status.

## Getting Started

### 1. Claude Desktop

The fastest way to get started. Sign up, connect your MyChart account, and add the MCP server to Claude Desktop.

1. Sign up at [openrecord.fanpierlabs.com](https://openrecord.fanpierlabs.com) (or your self-hosted instance)
2. Add your MyChart account — hostname, username, and password
3. Generate an MCP URL
4. In Claude Desktop: **Settings → MCP Servers → Add** → Name: `mychart` and MCP URL: the one you copied

One URL works for all your MyChart accounts. If you have multiple accounts connected, tools accept an optional `instance` parameter to target a specific hospital. TOTP-enabled instances auto-connect on first tool call.

MCP servers added in Claude Desktop automatically sync to the **Claude mobile app** and any other MCP-compatible client.

### 2. OpenClaw Plugin (Local, No Server)

Runs entirely on your machine with no server dependency.

```bash
# Install
cd openclaw-plugin && bun run build
openclaw plugins install -l ./openclaw-plugin

# Setup (interactive — configures hostname, username, password, optional TOTP)
openclaw mychart setup

# Check config
openclaw mychart status

# Reset credentials
openclaw mychart reset
```

The plugin auto-logs in on first tool call, keeps the session alive, and re-authenticates when it expires. Optionally import credentials from your browser (Chrome, Arc, Firefox) during setup.

## Deployment

### Self-Host on Railway

Deploy your own instance with one click:

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/5F69Mf?referralCode=xrxOUg)

The template automatically provisions a Postgres database, generates secrets, and runs migrations on first startup. No manual configuration required.

| Variable | Description |
|---|---|
| `DATABASE_URL` | Auto-injected by Railway Postgres plugin |
| `BETTER_AUTH_SECRET` | Auto-generated by template |
| `ENCRYPTION_KEY` | Auto-generated by template |
| `GOOGLE_CLIENT_ID` | Optional — for Google OAuth sign-in |
| `GOOGLE_CLIENT_SECRET` | Optional — for Google OAuth sign-in |

**Setup:**

1. Click the deploy button above
2. Wait for the build to finish (~2 minutes)
3. Visit your domain, sign up, add your MyChart account, and generate an API key

### AWS Fargate

The web app deploys to AWS Fargate via a single command:

```bash
bun run deploy
```

This builds a Docker image, pushes it to ECR, and deploys to ECS Fargate. Infrastructure:

- **Platform**: AWS Fargate (spot instances)
- **Config**: `web/deploy.yaml`
- **Resources**: 1 vCPU, 2 GB RAM, 21 GB ephemeral storage
- **Frontend**: CloudFront + ALB + Route53
- **Auth**: BetterAuth (email+password, Google OAuth) with PostgreSQL
- **Secrets**: AWS Secrets Manager (Resend API key for email 2FA, BetterAuth secret, Google OAuth creds)

## Architecture

```
openrecord/
  scrapers/          # Shared MyChart scraper code (login, API calls, parsing)
  web/               # Next.js web app + hosted MCP server
  openclaw-plugin/   # Self-contained OpenClaw plugin
  cli/               # Headless CLI for testing and scripting
  shared/            # Common types and enums
```

The scrapers are shared across all entry points (web app, OpenClaw plugin, CLI). Each entry point handles auth and session management differently, but they all call into the same scraper functions.

## Development

```bash
bun install

# Web app
cd web && bun run dev        # Next.js dev server
cd web && bun run build      # Production build

# Fake MyChart (for development without real credentials)
cd fake-mychart && bun run dev   # Fake MyChart server on port 4000

# CLI
bun run cli                  # Run the CLI scraper

# Tests
bun run test                 # All tests (unit + web)
bun run test:unit            # Scraper unit tests only
bun run test:unit:web        # Web app tests only
bun run test:fake-mychart    # Fake MyChart integration tests

# Linting
bun run lint                 # ESLint (scrapers + web)
bun run fix                  # ESLint auto-fix
```

## License

Proprietary source-available license (see `LICENSE`). Viewing and personal/educational use permitted; no commercial use, redistribution, SaaS offerings, or competing products without written permission from Fan Pier Labs.
