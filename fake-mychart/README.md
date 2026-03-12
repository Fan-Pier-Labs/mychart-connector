# Fake MyChart

A standalone Next.js server that faithfully mimics Epic MyChart's web API surface. Pre-loaded with Homer Simpson fake data across 30+ medical data categories. All state lives in RAM — no database, no external dependencies.

## Why This Exists

1. **International engineers can't get real MyChart accounts** — signing up requires a US SSN and an active patient relationship with a hospital. This blocks engineers in India, Europe, etc. from developing or testing scrapers.
2. **CI needs a real HTTP target** — unit tests use in-process mocks, but integration tests need an actual server to exercise the full login flow, cookie handling, redirects, and HTML parsing.
3. **Fast iteration** — no rate limits, no 2FA emails to wait for, no session expiry surprises. The fake server responds instantly and accepts a fixed 2FA code.

## Credentials

| Field    | Value        |
|----------|--------------|
| Username | `homer`      |
| Password | `donuts123`  |
| 2FA Code | `123456`     |

Set `FAKE_MYCHART_ACCEPT_ANY=true` to accept any username/password.

## Running

```bash
cd fake-mychart
bun install
bun run dev    # Development mode → http://localhost:4000
```

For production builds:
```bash
bun run build
bun run start  # Production mode → http://localhost:4000
```

## Connecting Scrapers

Pass `protocol: 'http'` to `MyChartRequest` or `myChartUserPassLogin`:

```ts
import { myChartUserPassLogin } from './scrapers/myChart/login'

const result = await myChartUserPassLogin({
  hostname: 'localhost:4000',
  user: 'homer',
  pass: 'donuts123',
  protocol: 'http',
})
// result.state === 'logged_in'
```

Or via the CLI:
```bash
bun run cli mychart --host localhost:4000 --user homer --pass donuts123 --no-cache --protocol http
```

## Architecture

```
fake-mychart/
  src/
    app/
      route.ts                    # GET / → 302 to /MyChart/ (firstPathPart discovery)
      MyChart/
        [...path]/
          route.ts                # Catch-all: dispatches all 80+ URL patterns
    data/
      homer.ts                    # All Homer Simpson fake data (~800 lines)
    lib/
      session.ts                  # In-memory session store (Map + 30-min TTL)
      csrf.ts                     # Fake CSRF token generation
      html.ts                     # HTML page templates for cheerio-parsed pages
```

### Key design decisions

- **Single catch-all route** — One file (`[...path]/route.ts`) handles everything. It parses the URL path segments and dispatches to handler functions. This keeps the server simple and easy to extend.
- **All state in RAM** — Sessions, conversations, and any mutations (sending messages, deleting threads) live in memory. Restarting the server resets everything to the Homer Simpson seed data.
- **No HTTPS** — The fake server runs plain HTTP only. Scrapers pass `protocol: 'http'` to connect.
- **Fake CSRF tokens** — Every HTML page includes a `__RequestVerificationToken` hidden input. The server generates tokens but never validates them, matching how scrapers interact with real MyChart.

## Patient Data: Homer Jay Simpson

All fake data is shaped to exactly match the JSON/HTML structures that the scrapers parse. The patient:

| Field | Value |
|-------|-------|
| Name | Homer Jay Simpson |
| DOB | 05/12/1956 |
| Age | 69 |
| MRN | 742 |
| PCP | Dr. Julius Hibbert, MD |
| Blood Type | O+ |
| Height | 6'0" |
| Weight | 260 lbs |

### Data categories implemented

| Category | Scraper | Key Data |
|----------|---------|----------|
| **Profile** | `profile.ts` | Name, DOB, MRN, PCP, email |
| **Health Summary** | `healthSummary.ts` | Age, blood type, vitals overview |
| **Medications** | `medications.ts` | Duff Beer Extract 500mg, Donut Supplement, Lisinopril, Atorvastatin |
| **Allergies** | `allergies.ts` | Vegetables (Severe), Exercise (Moderate) |
| **Health Issues** | `healthIssues.ts` | Obesity, Hypertension, Hypercholesterolemia, Radiation exposure |
| **Immunizations** | `immunizations.ts` | Flu, Tdap, COVID-19, Hep B |
| **Vitals** | `vitals.ts` | BP 145/95, HR 88, Weight 260 lbs with history |
| **Care Team** | `careTeam.ts` | Dr. Julius Hibbert (PCP), Dr. Nick Riviera (Surgery) |
| **Insurance** | `insurance.ts` | Springfield Nuclear Power Plant Employee Health Plan |
| **Emergency Contacts** | `emergencyContacts.ts` | Marge Simpson (Spouse), Barney Gumble (Friend) |
| **Medical History** | `medicalHistory.ts` | Diagnoses, surgeries (triple bypass, crayon removal), family history |
| **Lab Results** | `labResults.ts` | CMP, Lipid Panel, CBC — cholesterol and triglycerides high |
| **Visits** | `visits.ts` | Upcoming: annual physical. Past: ER donut incident, radiation screening |
| **Messages** | `conversations.ts` | Threads with Dr. Hibbert (weight mgmt) and Dr. Nick (discount surgery) |
| **Billing** | `bills.ts` | Multiple billing accounts with charges |
| **Letters** | `letters.ts` | After-visit summaries from Dr. Hibbert |
| **Goals** | `goals.ts` | Lose 50 lbs (care team), eat one vegetable/week (patient) |
| **Referrals** | `referrals.ts` | Cardiology referral to Dr. Nick |
| **Preventive Care** | `preventiveCare.ts` | Colonoscopy overdue, flu shot due |
| **Documents** | `documents.ts` | After Visit Summary, Lab Results Report |
| **Questionnaires** | `questionnaires.ts` | PHQ-9, Health Risk Assessment |
| **Care Journeys** | `careJourneys.ts` | Weight Management Program |
| **Activity Feed** | `activityFeed.ts` | New lab results, appointment reminders |
| **Education Materials** | `educationMaterials.ts` | Heart Health, Managing Cholesterol |
| **EHI Export** | `ehiExport.ts` | Full Health Record template |
| **Upcoming Orders** | `upcomingOrders.ts` | Lipid Panel, HbA1c |
| **Linked Accounts** | `linkedAccounts.ts` | Shelbyville Medical Center |

## Messaging (Mutable State)

Messages are fully interactive. You can:

- **List conversations** — returns seed data plus any new messages sent this session
- **Read conversation threads** — full message history with timestamps and senders
- **Send a new message** — goes through the full compose flow (get topics → get recipients → get compose ID → send). The new conversation appears in subsequent list calls.
- **Reply to a message** — appends to an existing conversation thread
- **Delete a conversation** — removes it from the in-memory list

All mutations persist in RAM until the server restarts.

### Message flow (what the scraper does)

```
1. POST /api/medicaladvicerequests/getsubtopics        → list of topics
2. POST /api/medicaladvicerequests/getmedicaladvicerequestrecipients → list of providers
3. POST /api/medicaladvicerequests/getviewers           → viewer permissions
4. POST /api/conversations/getcomposeid                 → compose session ID
5. POST /api/medicaladvicerequests/sendmedicaladvicerequest → send the message
6. POST /api/conversations/removecomposeid              → cleanup
```

## Login Flow

The fake server replicates the exact login flow that `scrapers/myChart/login.ts` expects:

```
1. GET /                                    → 302 to /MyChart/ (firstPathPart = "MyChart")
2. GET /MyChart/Authentication/Login        → HTML with __RequestVerificationToken + loginpagecontroller.min.js
3. GET /MyChart/loginpagecontroller.min.js  → JS with Credentials:{Username:""} pattern
4. POST /MyChart/Authentication/Login/DoLogin → checks creds, returns:
   - Success: HTML containing "md_home_index"
   - Need 2FA: HTML containing "secondaryvalidationcontroller"
   - Failed: HTML containing "login failed"
5. (If 2FA) POST /MyChart/Authentication/SecondaryValidation/Validate → accepts code "123456"
6. GET /MyChart/inside.asp                  → confirms session
```

### Session management

- Login sets a `MyChartSession=<uuid>` cookie
- `GET /MyChart/Home` returns 200 if session valid, 302 to login if not
- Sessions expire after 30 minutes of inactivity
- Keepalive endpoint at `/MyChart/Home/KeepAlive` returns `"1"`

## What's NOT Implemented

### eUnity / Imaging Viewer

The imaging system (eUnity) is an entirely separate server that MyChart links to via SAML authentication. It uses a proprietary binary protocol (AMF3) to serve medical images. This is **not implemented** in the fake server because:

- It requires a separate server with its own session management
- The AMF3 protocol for image data is complex binary serialization
- SAML authentication chain involves multiple redirects across domains
- The scraper endpoints affected: `FdiData` API, SAML chain, eUnity viewer, image pixel data download

### Medication Refill

`POST /api/medications/RequestRefill` is not implemented. The endpoint exists in the real MyChart for requesting prescription refills.

### Draft Persistence

Message draft endpoints (`savereplydraft`, `savemedicaladvicerequestdraft`) return success but don't actually persist — drafts are discarded. This doesn't affect normal message sending.

## CI Integration

The GitHub Actions workflow (`.github/workflows/checks.yml`) has a `fake-mychart` job that:

1. Builds the fake server (`bun run build`)
2. Starts it in the background (`bun run start &`)
3. Polls until the server responds with 302 on `GET /`
4. Runs all 29 integration tests against it (`bun run test:fake-mychart`)

```bash
# Run locally
cd fake-mychart && bun run build && bun run start &
# Wait for server...
bun run test:fake-mychart
```

## Adding New Endpoints

To add a new endpoint:

1. Add fake data to `src/data/homer.ts`
2. Add the URL pattern match in `src/app/MyChart/[...path]/route.ts`
3. If it's an HTML page parsed by cheerio, add a template in `src/lib/html.ts`
4. Add a test case in `scrapers/myChart/__tests__/fake-mychart/fake-mychart.test.ts`
