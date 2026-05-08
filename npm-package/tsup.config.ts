import { defineConfig } from 'tsup';

// Two builds:
// 1. The library (`src/index.ts` → ESM + CJS + .d.ts).
// 2. The CLI (`./cli/cli.ts` → CJS only, with #!/usr/bin/env node shebang
//    and the Resend / AWS SDK marked external — the CLI loads those lazily
//    only when `--resend-2fa` is passed, which end-users won't ever do).
export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    target: 'node18',
    esbuildOptions(options) {
      // dev-main `if (import.meta.main)` blocks intentionally evaluate to
      // `false` when bundled into CJS — that's the whole point.
      options.logOverride = { ...(options.logOverride ?? {}), 'empty-import-meta': 'silent' };
    },
    noExternal: [/scrapers[\\/]myChart/],
  },
  {
    entry: { cli: './cli/cli.ts' },
    format: ['cjs'],
    outExtension: () => ({ js: '.cjs' }),
    dts: false,
    sourcemap: true,
    clean: false, // don't blow away the library build
    splitting: false,
    target: 'node18',
    esbuildOptions(options) {
      // dev-main `if (import.meta.main)` blocks intentionally evaluate to
      // `false` when bundled into CJS — that's the whole point.
      options.logOverride = { ...(options.logOverride ?? {}), 'empty-import-meta': 'silent' };
    },
    banner: { js: '#!/usr/bin/env node' },
    // Lazy-loaded inside `cli/resend/resend.ts`. End-users never trigger
    // this path; FPL devs install the deps in their root package.json.
    external: ['resend', '@aws-sdk/client-secrets-manager'],
    // Bundle the scraper sources + the CLI helper modules.
    noExternal: [/scrapers[\\/]myChart/, /cli[\\/]/, /shared[\\/]/, /read-local-passwords/],
    // chmod the output so it's executable as a bin.
    onSuccess: async () => {
      const { chmod } = await import('node:fs/promises');
      try {
        await chmod('dist/cli.cjs', 0o755);
      } catch {
        // ignore — file may not exist on a failed build
      }
    },
  },
]);
