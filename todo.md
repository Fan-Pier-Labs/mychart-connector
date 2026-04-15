

todo
- [ ] get it published on open claw
- [x] add profile
- [x] make a splash page that explains what the project does. 
- [ ] get it on openclaw (openclaw plugins install @yourpkg/mychart)



todo

- [ ] allow log in to multiple differenct mychart sites at once
- [ ] keep the sessions alive
- [x] get contents of x rays  
- [ ] get contents of mri 
- [ ] show your mychart profile on the homepage after you log in (name, dob, patient id, etc)
- [ ] scrape the part where it shows you other mycharts too

- [ ] get all the messages
- [ ] get the keep alive working 
- [ ] find a list of mycharts, and have the input be a autocomplete dropdown? 



- [ ] be able to send messages with mcp call
- [ ] be able to ask for itemized bills for every one you haven't asked for an itemized bill yet
- 



could also do





  Plugin vs Skill in OpenClaw

  ┌───────────────────┬────────────────────────────────────┬─────────────────────────────────────────────┐
  │                   │               Skill                │                   Plugin                    │
  ├───────────────────┼────────────────────────────────────┼─────────────────────────────────────────────┤
  │ What it is        │ A SKILL.md file with instructions  │ TypeScript code that runs in the Gateway    │
  ├───────────────────┼────────────────────────────────────┼─────────────────────────────────────────────┤
  │ What it does      │ Teaches the agent how to use tools │ Actually provides tools, commands, services │
  ├───────────────────┼────────────────────────────────────┼─────────────────────────────────────────────┤
  │ Can execute code? │ No                                 │ Yes (api.registerTool())                    │
  ├───────────────────┼────────────────────────────────────┼─────────────────────────────────────────────┤
  │ Can ship skills?  │ N/A                                │ Yes (via skills field in manifest)          │
  └───────────────────┴────────────────────────────────────┴─────────────────────────────────────────────┘

  You need a plugin. A skill alone can't execute code or call MyChart APIs - it's just markdown instructions. A plugin can register actual tools via api.registerTool() that call your scraper code, AND it can bundle a skill that teaches the
  agent how to use them well.

  Why OpenClaw Plugin Makes Sense for This

  1. Multi-channel access - users could query their health data from WhatsApp, Telegram, Discord, iMessage - not just a CLI
  2. Built-in config UI - configSchema + uiHints give you a nice way to collect MyChart hostname, username, password with sensitive: true
  3. npm distribution - openclaw plugins install @yourpkg/mychart is clean
  4. Tool registration is straightforward - each scraper becomes a registerTool() call
  5. Bundled skill can teach the agent how to interpret health data, suggest follow-ups, etc.

  What It Would Look Like

  openrecord/
  ├── openclaw.plugin.json     # manifest with configSchema for credentials
  ├── package.json             # npm package with openclaw.extensions
  ├── src/
  │   └── index.ts             # registerTool() for each MyChart category
  ├── skills/
  │   └── mychart/
  │       └── SKILL.md         # teaches agent about health data queries

  The plugin would register tools like get_medications, get_lab_results, get_upcoming_visits, etc., each calling your existing scraper functions under the hood.

  Want me to scaffold this out?

✻ Churned for 1m 16s

❯ do open claw plugins have unrestricted access to the filesystem?

⏺ Fetch(https://docs.openclaw.ai/plugins)
  ⎿  Received 23.2KB (200 OK)

⏺ Fetch(https://docs.openclaw.ai/security)
  ⎿  Received 63.5KB (200 OK)

⏺ Yes, plugins have unrestricted filesystem access at runtime. They run in-process with the Gateway — no sandbox, no container isolation. The docs are explicit: "treat them as trusted code."

  There are some safety checks, but only at discovery/install time:
  - Blocks symlink/path traversal escapes outside the plugin root
  - Rejects plugins from world-writable directories
  - Validates path ownership (must be current uid or root)

  Once loaded, a plugin has the full privileges of the Gateway process.

  However, the agent side does have sandboxing options:
  - Optional Docker-based tool sandboxing for agent tool execution
  - tools.fs.workspaceOnly to scope file operations to a workspace
  - Per-agent sandbox modes (off, all, selective)
  - Read-only vs read-write workspace access levels

  So the distinction is:
  - Plugin code (your register() function, tool handlers) = full access, trusted
  - Agent tool calls (what the AI decides to do) = can be sandboxed

  For your MyChart plugin this is actually fine — your tool handlers need to make network requests to MyChart APIs and manage cookies/sessions, so you want unrestricted access in the plugin code. The sensitive operations happen in your handler
   functions, not in arbitrary agent-directed filesystem access.