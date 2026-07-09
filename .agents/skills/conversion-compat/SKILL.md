---
name: conversion-compat
description: Change zod-ai-tool's Zod-to-JSON-Schema conversion safely across the Zod 3 and Zod 4 code paths, including what to test and how the CI matrix pins versions.
---

# Changing Conversion Behavior

## When to Use This

Any change to `src/convert.ts`, or any change that alters the JSON Schema the builders
emit — new Zod construct support, normalization tweaks, diagnostics.

## Two Code Paths, One Contract

Conversion has two implementations behind one function:

- **Zod 4** uses the built-in `z.toJSONSchema`.
- **Zod 3** falls back to `zod-to-json-schema`, resolved lazily via `createRequire` so
  Zod 4 consumers never load it.

Both paths must produce equivalent normalized output. A change that passes on the locally
installed Zod version proves nothing about the other path.

## How Version Coverage Works

- `test/zod-version.ts` exposes `isZod4`, detected from the installed Zod at runtime.
- `test/zod3.fixture.test.ts` and `test/zod4.fixture.test.ts` gate on it with
  `describe.runIf`, so locally only the installed version's suite runs.
- CI runs the full matrix: Node 20/22/24 against Zod `3.25.28`, `3`, `4.0.0`, and `4`,
  pinned per leg with `pnpm add -D zod@<version>`.

To exercise the Zod 3 path locally, pin it the same way CI does, run the tests, then
restore `package.json` and `pnpm-lock.yaml` before committing:

```bash
pnpm add -D zod@3.25.28 && pnpm test
git checkout package.json pnpm-lock.yaml && pnpm install
```

Never commit the pin.

## What a Conversion Change Must Cover

- Zod 3 and Zod 4 fixture suites both exercise the new behavior.
- Required vs optional fields (`test/optional-fields.test.ts`).
- Nullable fields (`test/nullable-fields.test.ts`) — and remember the strict-mode
  invariant: never normalize `null` to `undefined`.
- Nested objects and arrays.
- Unsupported Zod constructs produce diagnostics, not silent output
  (`test/unsupported-zod-constructs.test.ts`).
- Snapshot diffs in `test/__snapshots__/` are reviewed line by line. A snapshot update is
  a claim that every changed line is intended provider-facing output.

## Finish

`pnpm check`, then confirm CI's matrix is green before treating the change as done — the
local run only covered half the compatibility surface.
