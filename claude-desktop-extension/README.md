# OpenRecord — Claude Desktop Extension

A Claude Desktop Extension (`.mcpb`) that gives Claude access to your Epic
MyChart patient portal. Read your medications, lab results, imaging, messages,
billing, and more — or send a message to your care team, request a refill,
and manage emergency contacts — all through a natural conversation.

## Install

```bash
cd claude-desktop-extension
bun install
bun run pack          # builds dist/server.cjs and produces openrecord.mcpb
```

Then double-click `openrecord.mcpb` (or drag it into Claude Desktop → Settings → Extensions).

## Use

After installing, open a new Claude chat and say:

> Set up my MyChart.

Claude calls the `setup_account` tool, which walks you through a guided form:

1. **Pick your MyChart** — type a few letters of your health system's name
   (e.g. "uchealth", "mass general") or paste the full mychart.* hostname.
2. **Username + password** — enter your credentials. They're stored locally
   in `~/.openrecord-mcpb/` on your machine. Never sent to Anthropic.
3. **2FA** (if your account requires it) — enter the 6-digit code MyChart
   sends to your email/SMS.
4. **Passkey** — opt in (recommended) and future logins skip the password
   and 2FA prompts entirely.

After setup, every other tool just works:

> What's my next appointment?
> Refill my lisinopril.
> Send a message to Dr. Smith asking about my latest blood pressure reading.
> Show me my last imaging study.

## Architecture

- **stdio MCP server** — speaks the 2025-06-18 MCP protocol with elicitation
  support. Claude Desktop ships its own Node runtime; no Node install needed
  on the user's machine.
- **Pure JS** — no `sharp`, no `keytar`, no `sqlite3`. CLO → JPEG imaging
  conversion uses [`jpeg-js`](https://www.npmjs.com/package/jpeg-js).
- **Local storage** — credentials and sessions live at `~/.openrecord-mcpb/`:
  - `accounts.json` — username/password (file mode 0600)
  - `passkeys/<hostname>.json` — WebAuthn credentials
  - `sessions/<hostname>.json` — serialized cookie jars for fast resume

## File layout

```
claude-desktop-extension/
├── manifest.json           # MCPB manifest (see https://github.com/modelcontextprotocol/mcpb)
├── package.json
├── tsup.config.ts          # single-file CJS bundle for Claude Desktop's Node
├── icon.png                # 256×256 extension icon
└── src/
    ├── index.ts            # stdio entry
    ├── tools.ts            # registers setup_account + all scraper tools
    ├── setup-flow.ts       # elicitation-driven setup wizard
    ├── session-manager.ts  # per-account session cache with keepalive + passkey auto-login
    ├── credential-store.ts # ~/.openrecord-mcpb/ persistence
    ├── instances.ts        # picker data (sourced from scrapers/list-all-mycharts/)
    └── imaging/            # pure-JS CLO → JPEG encoder
```

## Development

```bash
bun run build      # produces dist/server.cjs
bun run dev        # tsup watch mode
bun run pack       # build + run `mcpb pack` → openrecord.mcpb
```

To test in Claude Desktop:

1. `bun run pack`
2. Drag the resulting `openrecord.mcpb` into Claude Desktop → Settings → Extensions.
3. Open a new chat and ask Claude to "set up MyChart".
