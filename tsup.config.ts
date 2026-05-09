import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  shims: false,
  // Banner provides:
  //  1. A shebang so the file is directly executable.
  //  2. A `require` shim built from `createRequire` so the bundled
  //     CommonJS deps (e.g. commander) can resolve Node built-ins
  //     ("events", "fs", etc.) via real Node require — without this,
  //     esbuild's __require shim throws "Dynamic require of …".
  banner: {
    js: `#!/usr/bin/env node
import { createRequire as __createRequire } from 'module';
const require = __createRequire(import.meta.url);`,
  },
  splitting: false,
  sourcemap: false,
  dts: false,
  // Bundle the runtime npm deps into the single file so the released
  // artifact runs without a node_modules sibling. Node built-ins
  // (events, fs, http, etc.) stay external by default.
  noExternal: [
    '@graphql-typed-document-node/core',
    'commander',
    'graphql',
    'https-proxy-agent',
    'undici',
    'zod',
  ],
});
