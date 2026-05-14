# Tests

End-to-end and integration tests for the mychart-connector project. Unit
tests live alongside their source files (`*.test.ts`); this folder is for
larger integration suites that need real services running.

## Layout

```
tests/
└── integration/
    └── ci/                         # CI integration suite (Docker Compose)
        ├── integration.test.ts         # Full user-journey suite (API)
        ├── cli-passkey.test.ts         # CLI passkey setup/removal against fake-mychart
        ├── fake-mychart-passkey-ui.test.ts  # Browser-driven passkey UI test (Playwright)
        ├── toggle-ui.test.ts           # Browser-driven instance enable/disable toggle (Playwright)
        └── package.json                # Local deps for this suite
```

## `tests/integration/ci/`

Runs the full user journey against the services defined in
`docker-compose.ci.yaml` (PostgreSQL 18, fake-mychart, web app). See the
top-level `CLAUDE.md` for the full list of scenarios.

### Running locally

```bash
# Start services
docker compose -f docker-compose.ci.yaml up -d --build --wait

# Run the suite
bun run test:ci-integration

# Tear down
docker compose -f docker-compose.ci.yaml down -v
```

### Dependencies

`tests/integration/ci/package.json` pulls in:

- `pg` — direct PostgreSQL access (e.g. to extract password-reset tokens
  from the `verification` table).
- `@better-auth/utils` — shared with the web app for auth helpers.
- `playwright` — **only used by the two `*-ui.test.ts` files** to drive a
  real Chromium instance. The passkey UI test specifically needs
  Playwright's WebAuthn virtual authenticator (a CDP feature) — plain
  `fetch` can't replicate it. The toggle test could in principle be
  replaced by an API test + a small RTL component test.

### Future cleanup: consider dropping Playwright

Playwright is a heavy install (downloads a full Chromium binary on
`bun install`) and noticeably slows down CI for what is otherwise a
fast, API-driven suite. Options:

1. **Move the UI tests to their own package** (e.g.
   `tests/integration/ci-ui/`) so `tests/integration/ci/` stays
   fetch-only. The CLI/API tests then install in seconds.
2. **Drop `toggle-ui.test.ts` entirely** and cover the instance
   enable/disable toggle via an API test against
   `PATCH /api/mychart-instances/:id` plus a unit/component test for the
   visual states. Keep the passkey UI test if you want true browser
   coverage of the WebAuthn flow.
3. **Drop both `*-ui.test.ts` files** if browser coverage isn't worth
   the install cost — the underlying functionality is already exercised
   by `integration.test.ts` (passkey API) and `cli-passkey.test.ts`
   (CLI passkey flow).

Option 1 or 2 is probably the right call: keeping Playwright off the
critical-path test image makes the common case much faster while
preserving the WebAuthn coverage.
