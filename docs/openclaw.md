# OpenClaw Plugin

Self-contained plugin in `openclaw-plugin/` that bundles all MyChart scraper code locally (no server needed).

- **Build**: `cd openclaw-plugin && bun run build` (produces `dist/index.js` via tsup)
- **Install**: `openclaw plugins install -l ./openclaw-plugin`
- **Setup**: `openclaw mychart setup` — interactive credential config with optional browser password import and TOTP setup
- **Status**: `openclaw mychart status` — show current config
- **Reset**: `openclaw mychart reset` — clear saved credentials
- Registers 35+ tools (`mychart_get_profile`, `mychart_get_medications`, `mychart_send_message`, etc.)
- Auto-login via TOTP, session keepalive every 30s, automatic re-login on expiry
- Key source files: `src/index.ts` (entry), `src/session.ts` (login/keepalive), `src/tools.ts` (tool registration), `src/setup.ts` (CLI), `src/config.ts` (credentials), `src/password-import.ts` (browser import)
