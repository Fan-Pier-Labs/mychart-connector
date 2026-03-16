# MyChart Scrapers - Memory

## eUnity Image Viewer Protocol (Reverse-Engineered 2026-03-03)

See `imaging-downloads/EUNITY_PROTOCOL.md` for full details.

**Direct HTTP download pipeline works end-to-end** (no Playwright needed):
1. SAML chain → JSESSIONID
2. AMF `getStudyListMeta` → code=0, study metadata with all series/instance UIDs
3. `CustomImageServlet` CLOWRAPPER → 6+ MB CLO image data

Key AMF protocol details (verified by byte-for-byte match with captured browser traffic):
- `AmfServicesMessage` sealed members: `messageID`, `messageType`, `body` (order matters!)
- `AmfServicesRequest` sealed members: `service`, `method`, `parameters` (NOT `args`)
- Parameter is `StudyListRequest` Externalizable object (NOT a string array)
- patientId format: `<MRN>$$$<SITE>` (triple dollar signs, e.g. `1234567$$$SITE`)
- AMF3Writer needs string reference table for correct encoding

Key endpoints on `eunity.example.org`:
- **`POST /e/AmfServicesServlet`** — AMF binary protocol for study metadata (series/instance UIDs)
- **`POST /e/CustomImageServlet`** — Image data (`CLOWRAPPER` or `CLOPIXEL`)
- Response format: `CLOHEADERZ01` magic + zstd-compressed Haar wavelet data
- Auth: JSESSIONID cookie from SAML chain; CLOAccessKeyID tokens are single-use, expire in ~1-2 min
- `node-fetch` fails at `redirect.example.org/cgi/selfauth` (TLS fingerprinting) — use `globalThis.fetch`

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

## Project Patterns
- Scrapers follow pattern: export async function that takes `MyChartRequest`, returns typed data
- `MyChartRequest` handles cookies, headers, redirects via `makeRequest(config)`
- CLI at `src/cli.ts` with `--host`, `--user`, `--pass`, `--2fa`, `--action` args
- Example Health (`mychart.example.org`) is primary test target
