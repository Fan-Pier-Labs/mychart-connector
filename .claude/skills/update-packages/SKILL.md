---
description: Update every dependency in every package.json across the repo to the latest stable version, fix any breaking changes, and verify lint + all test suites pass.
user_invocable: true
---

# Update Packages

Bump every dependency in every `package.json` across this monorepo to the latest **stable** version (no `beta`, `rc`, `alpha`, `canary`, `next`, or `experimental` tags), adjust any code that breaks, and make sure lint + all test suites are still green before the PR.

## Step 1: Inventory every package.json

```bash
find . -name "package.json" \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" \
  -not -path "*/.expo/*"
```

You should see (at minimum):
- `./package.json` (root)
- `./web/package.json`
- `./npm-package/package.json`
- `./shared/package.json`
- `./scrapers/package.json`
- `./scrapers/myChart/clo-image-parser/package.json`
- `./openclaw-plugin/package.json`
- `./fake-mychart/package.json`
- `./expo-app/package.json`
- `./tests/integration/ci/package.json`

If `find` returns a file you don't recognize, include it anyway — never skip a package.json.

## Step 2: Resolve "latest stable" for every dependency

For each package (both `dependencies` and `devDependencies`):

1. Look up the latest version via the npm registry:
   ```bash
   npm view <pkg> versions --json
   npm view <pkg> dist-tags --json
   ```
2. Pick the highest version on the `latest` dist-tag that is **NOT** a prerelease. Reject any version whose semver contains `-alpha`, `-beta`, `-rc`, `-canary`, `-next`, `-experimental`, `-pre`, or `-dev`.
3. Record the chosen target version. Keep the `^` prefix style that the file already uses (or whatever range operator the file uses for that package — don't change `~` to `^`).

Hints to make this fast:
- Run lookups in parallel — `npm view` calls are independent. Batch many in a single message.
- For workspace-internal packages (e.g. `@mychart-scrapers/shared`), keep the existing version string. Don't try to publish-bump internal packages.

## Step 3: Handle known compatibility constraints

Some packages are "anchor" packages — bumping them forces matching versions on their peers. **Bump the anchor and all of its locked peers as one set, to the latest combination that is mutually compatible.**

Known anchors in this repo (verify each before deciding the target — these constraints change over time):

- **Next.js + React + React DOM**
  - `next` pins the major versions of `react` and `react-dom` it supports. Match all three.
  - Check `next`'s peer deps: `npm view next@latest peerDependencies`.
- **Expo SDK + React Native + React + Expo modules** (`expo-app/`)
  - Expo SDK dictates exact versions of `react`, `react-native`, and every `expo-*` / `@expo/*` package.
  - Get the canonical pinned versions: `bunx expo install --check` (run inside `expo-app/`) — it will tell you what each Expo-managed package should be on for the installed SDK.
  - If you bump the Expo SDK major (e.g. 55 → 56), follow Expo's upgrade guide and accept whatever React/RN versions that SDK pins, even if newer ones exist on npm.
- **TypeScript + `@types/*` + ESLint plugins**
  - Keep `typescript` and `@types/node` aligned with the Node engines field (`"node": ">=18"` in `npm-package/`).
  - `@typescript-eslint/*` packages must be on the same minor version as each other.
- **AWS SDK v3 (`@aws-sdk/*`)** — bump all `@aws-sdk/*` packages to the same version in lockstep.
- **Sentry (`@sentry/*`)** — bump all `@sentry/*` packages to the same version in lockstep.
- **Radix UI (`@radix-ui/*`)** — independent versions, but bump them all together to whatever each one's latest is.
- **better-auth + @better-auth/passkey** — must match minor versions.
- **@modelcontextprotocol/sdk** — check that the MCP server code in `web/src/lib/mcp/` is compatible with the new SDK shape before bumping.

If the latest version of an anchor package isn't yet compatible with a peer's latest, **pick the highest mutually-compatible set** — that may mean staying one minor behind on either side. Document the constraint in the PR description so a reviewer understands why.

## Step 4: Apply the version bumps

Edit each `package.json` with the new versions. Then reinstall in each workspace that has its own lockfile:

```bash
bun install                              # root
cd web && bun install && cd ..
cd npm-package && bun install && cd ..
cd fake-mychart && bun install && cd ..
cd expo-app && bun install && cd ..
cd openclaw-plugin && bun install && cd ..
cd tests/integration/ci && bun install && cd ../../..
```

(Only the workspaces with their own `bun.lock` / `package-lock.json` / `yarn.lock` need a dedicated install — check for a lockfile in each folder first.)

For `expo-app/`, prefer:
```bash
cd expo-app && bunx expo install --check
```
which will warn about Expo-managed packages on the wrong version and let you align them in one step.

## Step 5: Fix breaking changes

Run a typecheck and full build before tests — they're the fastest way to surface API changes:

```bash
bun run lint
cd web && bun run build && cd ..
cd fake-mychart && bun run build && cd ..
```

For every error you hit:
1. Read the new package's CHANGELOG or migration guide (`npm view <pkg> repository.url` → README/CHANGELOG, or use WebFetch on the package's GitHub releases page).
2. Make the minimal code change in this repo to adopt the new API. Don't refactor surrounding code.
3. If a major bump requires substantial code changes that go beyond mechanical adaptation, **stop and ask the user** whether to:
   - Stay one major behind for that package, OR
   - Proceed with the larger code change

Common breaking-change hotspots in this repo to spot-check:
- `next` major → app router / config / image component changes; update `next.config.ts` if needed.
- `better-auth` minor/major → plugin signatures, session shape.
- `zod` 3 → 4 already done in places; watch for mixed usage.
- `@modelcontextprotocol/sdk` major → tool registration API.
- `cheerio` major → ESM-only changes.
- `eslint` major → flat config differences.
- `@sentry/nextjs` major → instrumentation hook changes.

## Step 6: Run every test suite

Run all of these and fix any failures:

```bash
bun run lint
bun run test:unit
bun run test:unit:web
bun run test
```

If CI integration tests are available (Docker running), also run:
```bash
docker compose -f docker-compose.ci.yaml up -d --build --wait
bun run test:ci-integration
docker compose -f docker-compose.ci.yaml down -v
```

Don't skip the CI integration tests just because they're slow — they're the only thing that catches runtime regressions in the web app's auth, MCP, and scraping endpoints. If Docker isn't running, ask the user whether to start it or skip CI integration (note the skip in the PR description).

For `expo-app/`, also run any unit tests it has and at minimum confirm `bunx expo doctor` is clean.

## Step 7: Fix every broken test

For each failing test:
1. Determine whether the failure is a **real regression** (the new package version actually broke behavior we depend on) or a **test-side change** (the new package version returns a slightly different shape / wording / order that the test asserts on).
2. For real regressions: fix the production code to restore correct behavior. Do NOT loosen the test to make it pass — that hides the regression.
3. For test-side changes: update the test to match the new expected output.
4. Re-run the affected suite. Keep going until everything is green.

If a test failure looks unrelated to a package bump (e.g. a flaky CI integration test), re-run the suite once. If it still fails, investigate — don't paper over flakiness.

## Step 8: Make sure lint is clean

```bash
bun run lint
bun run lint:web
```

If a package bump enables new lint rules and creates a flood of warnings, fix them. Don't disable rules to make the diff smaller.

## Step 9: Verify the web app still boots

Start the dev server and hit at least one route to confirm the app actually runs end-to-end:

```bash
PORT=$(python3 -c "import random; print(random.randint(3100, 3999))") \
  && cd web && PORT=$PORT bun run dev &
```

Wait for "Ready" in the output, then `curl http://localhost:$PORT/` to confirm a 200. Kill the server after.

For the Expo app, at minimum run `bunx expo doctor` and `bun run lint` inside `expo-app/`. Don't try to launch the simulator unless the user asks.

## Step 10: Commit and open a PR

1. Stage all package.json + lockfile changes plus any code adjustments.
2. Commit with a message like:
   ```
   Bump all packages to latest stable; fix N breaking changes
   ```
3. Push the branch.
4. Open a PR using `gh pr create`. In the PR body, include:
   - **Summary** — short list of major version bumps (e.g. `next 16 → 17`, `expo 55 → 56`).
   - **Compatibility decisions** — any package you intentionally held back, and why (cite the peer-dep conflict).
   - **Code changes** — every non-trivial code fix made to adopt a new API.
   - **Test plan** — boxes for lint, unit, web unit, CI integration, dev server smoke, expo doctor.

Do not enable auto-merge. Wait for the user.

## Rules

- **Latest stable only.** Never accept `-beta`, `-rc`, `-alpha`, `-canary`, `-next`, `-experimental`, `-pre`, `-dev`, or any other prerelease tag.
- **Keep ranges aligned in lockstep families.** `@aws-sdk/*`, `@sentry/*`, `@typescript-eslint/*`, `react` + `react-dom`, Expo-managed packages — bump as a group, never individually.
- **Don't bump internal workspace deps.** Packages named like `@mychart-scrapers/*` referenced via path/workspace stay as-is.
- **Don't downgrade.** If a package is already pinned ahead of what npm shows as latest (unlikely but possible with `next` tags), leave it alone and flag it.
- **Don't loosen tests to mask regressions.** Real failures get fixed in code, not muted in tests.
- **Don't disable lint rules** to absorb the diff. Fix the warnings or stop the bump.
- **No `git stash` ever** (project rule). If working tree gets crowded, commit WIP locally instead.
- **Stop and ask** if: (a) a major bump needs a refactor bigger than mechanical adaptation, (b) two anchor packages disagree on a peer and there's no clean resolution, or (c) tests start failing in a way that looks like a real bug in production code rather than a package issue.
