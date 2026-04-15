# OpenRecord iOS App — Development Log

## What Was Built

### Expo App (`expo-app/`)
- **Expo Router** file-based navigation with 3 tabs (Chat, History, Settings)
- **Onboarding flow**: Welcome → Face ID → API Key → Add MyChart Account
- **Chat screen**: Message bubbles, markdown rendering, tool call indicators
- **History screen**: Chat list with search, date display, long-press to delete
- **Settings screen**: MyChart account management, Claude API key (masked), model selector
- **Individual chat view**: Resume chats from history

### AI Integration
- **Claude API client** (non-streaming) with full tool use loop
- 25 health data tools defined (matching MCP server tool definitions)
- Tool executor bridges Claude's tool_use requests to on-device scrapers

### Scraper Integration (no forking)
- Scrapers imported directly from `scrapers/myChart/` via Metro `watchFolders`
- `session-manager.ts` — manages multi-account sessions, login, keepalive, auto-reconnect
- Node built-in shims (crypto→quick-crypto, fs/path/os→stubs, tough-cookie→iOS native cookies)
- `MyChartRequest` accepts injectable `fetchFn` — iOS uses native fetch, Node/Bun uses tough-cookie

### Main Repo Changes
- **Removed `fetch-cookie` dependency** — replaced with direct `tough-cookie` usage
- **Injectable `fetchFn`** in `MyChartRequest` constructor for platform-agnostic HTTP
- **Response URL fallback** in `determineFirstPathPart` for runtimes that ignore `redirect:"manual"`
- All 266 unit tests pass

## Tested (via Maestro on iOS Simulator)

- App builds and runs on iPhone 17 Pro simulator
- Onboarding auto-skips in dev mode when `secrets.local.json` has API key
- Settings: MyChart account visible, add/remove works
- Chat: sends messages, Claude responds with formatted markdown
- Tool use: Claude calls `get_profile`, scraper logs into fake-mychart.fanpierlabs.com, returns Homer Simpson's data (name, DOB, MRN, PCP, email)
- Session keepalive pings running
- Chat history with correct dates
- Tab navigation (Chat, History, Settings)

## Bugs Found & Fixed

1. **"No response body" error** — React Native's `fetch` doesn't support `response.body.getReader()` for streaming. Fixed by switching to non-streaming Claude API.
2. **cheerio `node:stream` import crash** — cheerio's ESM entry pulls in Node.js streams. Fixed with Metro `resolveRequest` to force cheerio's browser build.
3. **"Invalid Date" in history** — Fixed by passing ISO date strings as params instead of using `datetime('now')` SQL function.
4. **SafeAreaView deprecation** — Switched to `react-native-safe-area-context`.
5. **Tab routing warnings** — Tab names needed `/index` suffix to match directory structure.
6. **iOS ignores `redirect:"manual"`** — iOS native fetch follows redirects automatically, returning status 200 instead of 302. Fixed by extracting `firstPathPart` from the response URL as a fallback.
7. **iOS doesn't expose set-cookie headers** — iOS's `NSHTTPCookieStorage` manages cookies natively. Fixed by making `MyChartRequest` accept injectable `fetchFn` — on iOS, pass raw `fetch` and let the OS handle cookies.
8. **Metro doesn't support dynamic import templates** — `await import(\`${path}\`)` fails. Fixed with static imports for all 25 scraper modules.

## Architecture Decisions

1. **Non-streaming API** — React Native's fetch doesn't support `ReadableStream`. Used synchronous API calls. Text appears all at once per turn. Could add streaming later with a polyfill like `react-native-sse`.
2. **Injectable fetch** — `MyChartRequest` constructor accepts optional `fetchFn`. On iOS, raw `fetch` is passed (iOS handles cookies natively via `NSHTTPCookieStorage`). On Node/Bun, defaults to tough-cookie-wrapped fetch.
3. **No scraper forking** — Scrapers are imported directly from `scrapers/myChart/` via Metro `watchFolders`. Node built-in shims handle platform differences at the Metro resolver level.
4. **Maestro for iOS testing** — Maestro CLI provides text-based UI interaction on the iOS simulator without needing screen coordinates or accessibility permissions.

## Next Steps

1. **Streaming responses** — Add `react-native-sse` or similar for word-by-word streaming
2. **Passkey registration flow** — Wire `createCredential()` into Settings UI after first login
3. **2FA flow in app** — Show 2FA prompt when login returns `need_2fa`
4. **Test with real MyChart instance** — Verify against a real hospital portal
5. **App Store prep** — Icons, splash screen, privacy policy
