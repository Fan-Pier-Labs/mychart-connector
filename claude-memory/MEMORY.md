# MyChart Scrapers - Memory

## eUnity Image Viewer Protocol (Reverse-Engineered 2026-03-03)

See `scrapers/myChart/eunity/docs/EUNITY_PROTOCOL.md` for full details.

**Direct HTTP download pipeline works end-to-end** (no Playwright needed):
1. SAML chain → JSESSIONID
2. AMF `getStudyListMeta` → code=0, study metadata with all series/instance UIDs
3. `CustomImageServlet` CLOWRAPPER → 6+ MB CLO image data

Key AMF protocol details (verified by byte-for-byte match with captured browser traffic):
- `AmfServicesMessage` sealed members: `messageID`, `messageType`, `body` (order matters!)
- `AmfServicesRequest` sealed members: `service`, `method`, `parameters` (NOT `args`)
- Parameter is `StudyListRequest` Externalizable object (NOT a string array)
- patientId format: `<MRN>$$$<SITE>` (triple dollar signs)
- AMF3Writer needs string reference table for correct encoding

Key endpoints on the eUnity server:
- **`POST /e/AmfServicesServlet`** — AMF binary protocol for study metadata (series/instance UIDs)
- **`POST /e/CustomImageServlet`** — Image data (`CLOWRAPPER` or `CLOPIXEL`)
- Response format: `CLOHEADERZ01` magic + zstd-compressed Haar wavelet data
- Auth: JSESSIONID cookie from SAML chain; CLOAccessKeyID tokens are single-use, expire in ~1-2 min
- `node-fetch` fails at the SAML selfauth endpoint (TLS fingerprinting) — use `globalThis.fetch`

## Cookie Serialization Bug (Fixed 2026-03-03)

`MyChartRequest.serialize()` was sync but `cookieJar.serialize()` is async → serialized a Promise, not cookies. Fixed by making `serialize()` async + `await` at all call sites (cli.ts, storage.ts, web app).

## MyChart Messaging API (Reverse-Engineered)

See [mychart-messaging-api.md](mychart-messaging-api.md) for full details.

Key points:
- New messages use `/api/medicaladvicerequests/` endpoints (NOT `/api/conversations/`)
- Replies use `/api/conversations/SendReply`
- `messageBody` is an **array of strings**, not a plain string
- All API calls need `__RequestVerificationToken` header from `/app/communication-center` HTML
- WP-encoded IDs used throughout (e.g. `WP-24...`)

## MyChart Session Keepalive (Reverse-Engineered 2026-03-06)

MyChart has TWO separate timeout mechanisms:

**Server-side session**: Kept alive by calling `/Home/KeepAlive?cnt=N` and `/keepalive.asp?cnt=N` every 30s (both return "1" if alive, "0" if expired). These are the actual endpoints that reset the server session timer. Pinging `/Home` does NOT extend the session — it just serves the page.

**Client-side inactivity timer**: JavaScript `checkActivity()` tracks `$$WPUtil.setActivity.__lastActivity`. Shows a "Your session is expiring" popup at 19 min (`refreshTimeout=1140000ms`), force-logs out at 20 min (`sessionTimeout=1200000ms`). Only reset by user interaction (mouse/keyboard) or clicking "Stay logged in" (which calls `$$WPUtil.setActivity()`). The keepAlive pings do NOT reset this timer.

For our scraper: only the server-side keepalive matters. The client-side timer is browser JS only. Fixed in PR #59 — sessionStore now calls both `/Home/KeepAlive` and `/keepalive.asp` every 30s.

The globalThis singleton pattern is required for the sessionStore in Next.js — each API route is bundled separately, so module-level singletons create separate instances. See `scrapers/myChart/sessionStore.ts`.

## Project Patterns
- Scrapers follow pattern: export async function that takes `MyChartRequest`, returns typed data
- `MyChartRequest` handles cookies, headers, redirects via `makeRequest(config)`
- CLI at `cli/cli.ts` with `--host`, `--user`, `--pass`, `--2fa`, `--action` args
- Primary test target is the MyChart instance configured in creds.json

## Monorepo Structure (Refactored 2026-03-04)
- `scrapers/` — shared scraper code (myChart)
- `cli/` — CLI entry point + resend 2FA
- `shared/` — common types (AccountStatus, CommonMyChartAccount)
- `read-local-passwords/` — browser keystore extraction
- `scrapers/myChart/clo-image-parser/` — eUnity CLO image parser
- `web/` — Next.js web app (still has its own scraper copies in `web/src/lib/mychart/`)
- Tests: `bun test scrapers/myChart/__tests__/*.test.ts` (132 unit) + `cd web && bun test` (295 web)
- Node 25 + ESLint crashes (SIGABRT) — pre-existing issue, not refactor-related
