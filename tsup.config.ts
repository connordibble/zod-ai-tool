import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'es2020',
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // Never bundle the peer/optional deps — consumers provide them.
  external: ['zod', '@anthropic-ai/sdk', 'openai'],
});
