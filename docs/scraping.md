# Scraping Guide

## MyChart Login

- Login field auto-detection: `LoginIdentifier` vs `Username` — detected from `loginpagecontroller.min.js`
- `mychart.example.org` is the primary test target and often skips 2FA
- Fetch passwords from the browser keystore
- Do not ask the user for 2FA codes — retrieve them automatically via the Resend API (see [CLI docs](cli.md#automatic-2fa-via-resend))
- Session expiration: a 302 redirect to the Login page means cookies are dead
- **Passkey auto-login**: The web app stores passkey credentials (encrypted) per MyChart instance. Auto-connect prefers passkey login (bypasses 2FA entirely), falling back to username/password/TOTP. Users set up passkeys via a "Setup Passkey" button on the instance card. If a passkey fails (e.g. revoked on the portal), it is auto-cleared from the DB.
  - Key files: `web/src/lib/mcp/auto-connect.ts`, `web/src/app/api/mychart-instances/[id]/setup-passkey/route.ts`
  - Scraper layer: `scrapers/myChart/setupPasskey.ts` (registration), `scrapers/myChart/login.ts` (`myChartPasskeyLogin`), `scrapers/myChart/softwareAuthenticator.ts` (software WebAuthn)

## Scraping Tips

When reverse engineering health portal APIs (MyChart, etc.), the request headers must **exactly match** what the browser sends — including header name casing (lowercase), `origin` header, `user-agent` string version, and `x-clientversion`. A missing `origin` header alone causes a 403 Forbidden. Use Playwright MCP to capture the exact request the browser makes, then replicate it exactly in the scraper code. 

## Tools

- **Playwright MCP** is the preferred tool for exploring websites, reverse engineering APIs, and understanding web app behavior. Always use the Playwright MCP tools (browser_navigate, browser_snapshot, browser_click, browser_network_requests, etc.) rather than writing one-off TypeScript scripts that import Playwright directly. The MCP gives you an interactive browser session that's far more efficient for investigation and debugging.
