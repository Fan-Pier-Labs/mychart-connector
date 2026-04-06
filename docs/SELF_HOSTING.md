# Self-Hosting Guide

Run the OpenRecord web app on your own machine with a public URL via ngrok or Cloudflare Tunnel.

## Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- PostgreSQL (local install or Docker)
- [ngrok](https://ngrok.com) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) for public access

## 1. Set Up PostgreSQL

### Option A: Docker (recommended)

```bash
docker run -d \
  --name mychart-pg \
  -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mychart_local \
  postgres:17
```

Connection string: `postgresql://postgres:postgres@localhost:5432/mychart_local`

### Option B: Local PostgreSQL (macOS)

```bash
# Install via Homebrew
brew install postgresql@17
brew services start postgresql@17

# Create the database
createdb mychart_local
```

Connection string: `postgresql://your_macos_username@localhost:5432/mychart_local`

> **Note:** Local Postgres on macOS typically uses peer auth (no password). If you set a password, include it in the connection string: `postgresql://user:password@localhost:5432/mychart_local`

## 2. Set Up a Public URL

The web app needs a publicly accessible URL so that BetterAuth callbacks work correctly.

### Option A: ngrok

```bash
# Install
brew install ngrok

# Authenticate (one-time, get your token from https://dashboard.ngrok.com)
ngrok config add-authtoken YOUR_TOKEN

# Start tunnel
ngrok http 3000
```

Note the `https://....ngrok-free.dev` URL from the output.

### Option B: Cloudflare Tunnel

```bash
# Install
brew install cloudflared

# Quick tunnel (no Cloudflare account needed)
cloudflared tunnel --url http://localhost:3000
```

Note the `https://....trycloudflare.com` URL from the output.

## 3. Configure Environment

Create `web/.env.local`:

```env
# Database connection
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mychart_local

# Auth secrets (generate your own for production use)
BETTER_AUTH_SECRET=replace-with-a-random-string-at-least-32-chars
ENCRYPTION_KEY=01234567890123456789012345678901

# Your public URL from ngrok or Cloudflare Tunnel
BETTER_AUTH_URL=https://your-subdomain.ngrok-free.dev

# Optional: Google OAuth (sign-in with Google disabled without these)
# GOOGLE_CLIENT_ID=your-client-id
# GOOGLE_CLIENT_SECRET=your-client-secret
```

> **Generating secrets:**
> ```bash
> # BETTER_AUTH_SECRET
> openssl rand -base64 32
>
> # ENCRYPTION_KEY (must be exactly 32 characters)
> openssl rand -hex 16
> ```

## 4. Install Dependencies

```bash
cd web
bun install
```

## 5. Run Database Migrations

The migrate script doesn't auto-load `.env.local`, so pass the env vars explicitly:

```bash
cd web
export $(cat .env.local | xargs) && bun run scripts/migrate.ts
```

You should see:

```
[migrate] Starting migrations...
[migrate] BetterAuth migrations complete.
[migrate] Database migrations complete.
[migrate] Done.
```

## 6. Start the Dev Server

```bash
cd web
bun dev
```

Verify the auth log shows your public URL:

```
[Auth] Secrets loaded. Google OAuth: disabled. baseURL: https://your-subdomain.ngrok-free.dev
```

Visit your public URL to sign up and start using the app.

## Troubleshooting

### `baseURL` shows `http://localhost:3000`

Make sure `BETTER_AUTH_URL` is set in `web/.env.local`. Restart the dev server after changing env vars.

### `CredentialsProviderError: Could not load credentials from any providers`

The app is trying to use AWS Secrets Manager instead of env vars. Make sure `DATABASE_URL` is set — this triggers env-var mode and skips AWS.

### `SASL: client password must be a string`

Your `DATABASE_URL` is missing the username or password. Use the full format: `postgresql://user:password@localhost:5432/mychart_local`

### Cross-origin warnings

The `BETTER_AUTH_URL` is automatically used to configure `allowedDevOrigins` in Next.js and `trustedOrigins` in BetterAuth. No manual code edits needed.

### Session/auth not working through tunnel

Check that the auth log shows your tunnel URL as the `baseURL`. If it shows `localhost`, restart the dev server — the auth singleton caches the first value.

### ngrok URL changed

If you restart ngrok and get a new URL, update `BETTER_AUTH_URL` in `web/.env.local` and restart the dev server.

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Triggers env-var mode (skips AWS). |
| `BETTER_AUTH_SECRET` | Yes | Session signing secret. At least 32 characters. |
| `ENCRYPTION_KEY` | Yes | Encryption key for stored MyChart credentials. |
| `BETTER_AUTH_URL` | Yes | Your public URL (ngrok/Cloudflare/custom domain). Used as BetterAuth base URL and to configure allowed origins. |
| `TRUSTED_ORIGINS` | No | Comma-separated additional trusted origins for auth (e.g. `https://other.example.com`). |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID. Google sign-in disabled without this. |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret. |
| `PORT` | No | Server port (default: 3000). |
| `DB_SSL` | No | Set to `false` to disable SSL for the database connection. Defaults to enabled — only needed for local dev with a plain Postgres container. |
