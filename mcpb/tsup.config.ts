import { defineConfig } from 'tsup';
import path from 'path';

export default defineConfig({
  entry: {
    server: 'src/index.ts',
  },
  format: ['cjs'],
  outDir: 'dist',
  dts: false,
  sourcemap: true,
  clean: true,
  // We MUST externalize sharp because it's a native dependency and we're building a portable bundle.
  // The MCPB code will use a pure-JS imaging implementation instead.
  external: ['sharp', 'keytar', 'sqlite3', '@primno/dpapi'],
  noExternal: [/.*/],
  esbuildOptions(options) {
    options.define = {
      'console.log': 'console.error',
    };
    options.nodePaths = [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '..', 'node_modules'),
    ];
  },
});
