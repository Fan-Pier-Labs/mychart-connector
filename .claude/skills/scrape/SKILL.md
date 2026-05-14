---
description: Reverse-engineer a health portal website and build a complete scraper for it
user_invocable: true
arguments:
  - name: url
    description: The URL of the health portal to scrape
    required: true
---

# Scrape New Website

Build a complete scraper for the health portal at `{{ url }}` following the established patterns in this codebase.

## Phase 1: Reconnaissance with Playwright MCP

1. **Navigate** to `{{ url }}` using `browser_navigate`
2. **Take a snapshot** to understand the login page structure
3. **Enable network request capture** to monitor API calls
4. **Explore the site** — click through every page, menu, and tab to find all available data. We want to scrape everything a user would care about, including but not limited to:
   - **Medical records**: health history, diagnoses, conditions, allergies, immunizations, lab results, medications, prescriptions/refills
   - **Visits**: past visits, upcoming appointments, visit summaries
   - **Providers**: doctors, care team, primary care physician, specialists
   - **Insurance**: plans, ID cards, coverage details, group info
   - **Billing**: claims, EOBs (Explanation of Benefits), cost breakdowns, deductible/out-of-pocket progress (accumulations)
   - **Messages**: inbox messages, notifications
   - **Authorizations & referrals**: prior authorizations, referral status
   - **Documents**: letters, statements, PDFs
   - **Profile**: personal info, contact details, emergency contacts
   - Any other data the portal exposes that a user would find useful
5. **Capture every API request** the site makes using `browser_network_requests`:
   - Note the exact URL, method, headers (including casing), query parameters, and request body
   - Pay special attention to: `origin`, `referer`, `user-agent`, `authorization`, and any custom headers
   - Record the exact header name casing (lowercase vs PascalCase) — replicate whatever the browser sends
6. **Identify the auth mechanism**: Bearer tokens, cookies, session IDs, custom headers, etc.
7. **Identify the login flow**: standard login endpoint, 2FA mechanism, password encryption, etc.

## Phase 2: Build the Scraper

Create a new scraper directory at `scrapers/<scraper_name>/` following the existing MyChart pattern:

### File Structure
```
scrapers/<scraper_name>/
├── main.ts              # Entry point: scrapeAll(user, pass)
├── login.ts             # Login + 2FA handling
├── <name>Request.ts     # Request class (auth headers, base URL)
├── get<Feature>.ts      # One file per API endpoint/data category
├── types/               # Full TypeScript types for all API responses
│   ├── index.ts         # Re-exports all types
│   └── <feature>.ts     # Types per feature
└── __tests__/           # Unit tests for every file
    └── <feature>.test.ts
```

### Request Class Pattern
- Hardcode the `BASE_URL`
- Include ALL headers exactly as captured from the browser — same casing, same values, same set of headers per request type
- Replicate exactly what the browser does for each request — if the browser sends `content-type` on GET, send it; if it doesn't, don't
- Add auth headers however the browser sends them (Bearer token, cookies, session ID, custom headers, etc.)

### Login Pattern 
- Handle password encryption if the site does client-side encryption
- Support 2FA — use `sendTokenToEmail: true` or equivalent if available
- Return `{ accessToken, clientSessionId, refreshToken, loginResponse }`

### Scraper Functions Pattern (see any `get*.ts` file)
- Each function takes the request class instance as its only parameter
- Calls `request.makeRequest(path)` with the API path
- Parses and returns typed response data
- Keep it simple — just fetch and return

### Types Pattern
- Create accurate TypeScript interfaces matching the ACTUAL API response structure
- Use `| null` for nullable fields
- Re-export everything from `types/index.ts`
- Verify types against real API responses captured in Phase 1

## Phase 3: CLI Integration

1. **Create `npm-package/cli/<scraper_name>.ts`** following the existing CLI pattern:
   - Parse `--user` and `--pass` flags
   - Call `scrapeAll(user, pass)`
   - Output JSON results

2. **Update `npm-package/cli/entry.ts`** to add the new subcommand:
   ```typescript
   if (subcommand === '<scraper_name>') {
     import('./<scraper_name>').then(m => m.main()).catch(...)
   }
   ```

3. **Update `package.json`** test:unit script to include the new test directory

## Phase 4: Tests

Write unit tests for EVERY file using Bun's test runner (`bun:test`):

- Mock the request class to capture the API path and return mock data
- Test correct API path
- Test response parsing with realistic mock data
- Test edge cases (empty arrays, null fields, etc.)
- Target: one test file per scraper file, 4-6 tests each

## Phase 5: End-to-End Verification

Run the CLI scraper end-to-end and iterate until it works:

1. **Run the CLI**: `AWS_PROFILE=fanpierlabs bun run cli <scraper_name> --user <user> --pass <pass>`
2. **If it fails**, debug the issue — check headers, auth flow, response parsing, etc.
3. **Fix and re-run** — keep iterating until the full scrape completes successfully and all data is returned
4. **Verify the output** — ensure all scraped data categories return reasonable results (non-empty arrays, correct types)

Do NOT move on to documentation until the CLI scrape works end-to-end.

## Phase 6: Documentation

1. **Create `docs/<scraper_name>.md`** documenting:
   - API base URL and auth mechanism
   - All endpoints with their paths, methods, and descriptions
   - Header requirements
   - Login/2FA flow
   - File structure

2. **Update `CLAUDE.md`**:
   - Add the scraper to the project overview
   - Add CLI usage to Key Commands
   - Add docs link to Reference Docs
   - Update `npm-package/cli/entry.ts` subcommand docs

## Critical Rules

- **Headers must match the browser EXACTLY** — including lowercase casing, `origin`, `user-agent` version strings, and any custom headers. Use Playwright MCP to capture the exact headers. See CLAUDE.md "Scraping Tips".
- **Always use Playwright MCP** for browser investigation — never write one-off Playwright scripts
- **Type everything** — no `any` types
- **Run tests** before committing: `bun test scrapers/<scraper_name>/__tests__/`
- **Run lint** before committing: `bun run lint`
- **Never commit PII** — redact any real data from test fixtures
