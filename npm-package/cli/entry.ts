// CLI entry point with subcommand dispatch.
// Usage:
//   bun run cli mychart [flags]   — MyChart scraper (default if no subcommand)

const subcommand = process.argv[2];

// Default: run the MyChart CLI (pass all args through)
// If the user typed "bun run cli mychart ...", strip "mychart" from argv
if (subcommand === 'mychart') {
  process.argv.splice(2, 1);
}
import('./cli');
