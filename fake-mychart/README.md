# Fake MyChart

A standalone Next.js app that mimics MyChart's API surface, pre-loaded with Homer Simpson fake data. Used for development without real MyChart access and CI integration tests.

## Credentials

| Field    | Value        |
|----------|--------------|
| Username | `homer`      |
| Password | `donuts123`  |
| 2FA Code | `123456`     |

Set `FAKE_MYCHART_ACCEPT_ANY=true` to accept any credentials.

## Running

```bash
cd fake-mychart
bun install
bun run dev    # http://localhost:4000
```

## Connecting scrapers

Pass `protocol: 'http'` to `MyChartRequest`:

```ts
const req = new MyChartRequest('localhost:4000', 'http');
```

Or via the CLI:

```bash
bun run cli mychart --host localhost:4000 --user homer --pass donuts123 --no-cache --protocol http
```

## Architecture

- Single catch-all route at `src/app/MyChart/[...path]/route.ts` handles all 80+ URL patterns
- All fake data lives in `src/data/homer.ts`
- In-memory session store (`src/lib/session.ts`) — sessions expire after 30 min
- Mutable state for conversations — new messages persist in RAM until server restart
- Root `GET /` returns 302 to `/MyChart/` (for firstPathPart detection)
