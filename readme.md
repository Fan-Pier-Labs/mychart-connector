# MyChart Connector

Access your Epic MyChart health records through AI. Works as both an **OpenClaw plugin** and a hosted **MCP server** — use it with any MCP-compatible client including Claude Desktop, the Claude iOS/Android mobile app, Claude Code, or any other MCP client.

## Demo MCP Server

Try the MCP server with fake patient data — no account or API key required.

**Demo URL:** `https://mychart.fanpierlabs.com/api/mcp/demo`

Add it to Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mychart-demo": {
      "type": "streamableHttp",
      "url": "https://mychart.fanpierlabs.com/api/mcp/demo"
    }
  }
}
```

The demo server exposes the same 30+ tools as the real MCP server (medications, lab results, vitals, messages, etc.) but returns fictional data for a sample patient. All meta tools (list_accounts, connect_instance, check_session, complete_2fa) work as well — they just return pre-connected status.

## What It Does

Connects to any Epic MyChart patient portal and exposes 35+ tools for reading your health data:

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

MyChart Connector reverse-engineers Epic's MyChart web portal APIs. It logs in with your credentials, handles 2FA automatically (via TOTP authenticator codes), and makes the same API calls your browser would. No FHIR, no OAuth, no Epic developer account needed — just your MyChart username, password, and optionally a TOTP secret for automatic 2FA.

Sessions are kept alive automatically (pinging MyChart every 30 seconds) and re-established on expiry.

## Two Ways to Use It

### 1. OpenClaw Plugin (Local, No Server)

Runs entirely on your machine. All scraping happens locally.

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

### 2. Hosted MCP Server (Web App)

A Next.js web app that hosts a per-user MCP server. Deploy it and connect from any MCP client.

**For users:**

1. Sign up at the web app (email+password or Google OAuth)
2. Add your MyChart account(s) — hostname, username, password, and optionally a TOTP secret
3. Generate an API key at `POST /api/mcp-key`
4. Add the MCP server URL to your client:

```
https://your-domain.com/api/mcp?key=YOUR_API_KEY
```

One URL works for all your MyChart accounts. If you have multiple accounts connected, tools accept an optional `instance` parameter to target a specific hospital. TOTP-enabled instances auto-connect on first tool call.

**Adding to Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mychart": {
      "type": "streamableHttp",
      "url": "https://your-domain.com/api/mcp?key=YOUR_API_KEY"
    }
  }
}
```

**Adding to Claude mobile app:** Go to Settings > MCP, add the same URL.

## Deployment

### Self-Host on Railway

Deploy your own instance with one click:

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/5F69Mf?referralCode=xrxOUg)

**Required env vars:**

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Auto | Injected by Railway Postgres plugin |
| `BETTER_AUTH_SECRET` | Yes | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | Yes | `openssl rand -hex 32` |
| `NEXT_PUBLIC_BASE_URL` | Yes | Your Railway public domain with `https://` |
| `GOOGLE_CLIENT_ID` | Optional | For Google OAuth sign-in |
| `GOOGLE_CLIENT_SECRET` | Optional | For Google OAuth sign-in |

**Setup:**

1. Click the deploy button and attach a Postgres plugin
2. Set the required env vars listed above
3. Deploy — Railway runs migrations automatically
4. Visit your domain, sign up, add your MyChart account, and generate an API key

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
mychart-connector/
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
bun run dev          
bun run cli          # CLI scraper
bun run test         # Unit + web tests
bun run lint         # ESLint
```

## License

Proprietary source-available license (see `LICENSE`). Viewing and personal/educational use permitted; no commercial use, redistribution, SaaS offerings, or competing products without written permission from Fan Pier Labs.
