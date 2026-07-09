# zod-ai-tool Agent Instructions

## Purpose

zod-ai-tool derives Anthropic, OpenAI, and Gemini tool definitions from one Zod object
schema and validates model tool input with that same schema. The Zod schema is the source
of truth; the provider objects are derived from it. That is the whole package.

The package is deliberately small. Conversion and validation are in scope. SDK wrappers,
agent runtimes, tool-call loops, stream parsing, and orchestration are not. When a change
pushes toward those, stop and flag it instead of building it.

## Map

- `src/convert.ts` — Zod to JSON Schema conversion. Zod 4 uses the built-in
  `z.toJSONSchema`; Zod 3 falls back to `zod-to-json-schema`, resolved lazily via
  `createRequire` so neither path taxes the other.
- `src/anthropic.ts`, `src/openai.ts`, `src/openai-strict.ts`, `src/gemini.ts` — narrow
  provider builders. Each returns a provider-ready plain object. No network calls.
- `src/define.ts` — `defineAITool`, the coupling point: provider definitions plus
  `validate` and `safeParse`, all derived from the same schema.
- `src/types.ts` — local provider types. Deliberately no SDK imports.
- `test/zod3.fixture.test.ts` and `test/zod4.fixture.test.ts` — version-specific
  conversion coverage, gated by `describe.runIf` on the installed Zod.
- `examples/` — part of the package contract; typechecked and smoke-run by
  `test/examples-smoke.test.ts`.

## Commands

```bash
pnpm install        # setup, no credentials needed
pnpm check          # the gate: secrets scan, lint, typecheck, tests
pnpm test:coverage  # coverage thresholds (CI enforces on node 24 / zod 4)
pnpm build          # tsup -> dist (ESM + CJS)
```

`pnpm check` is the finishing gate. Run it before declaring any work done.

## Hard Rules

- No runtime dependency on any provider SDK. Provider shapes live in `src/types.ts` as
  local types. SDKs are allowed in `devDependencies` only, for type-compat tests.
- The root schema must remain a Zod object. Do not unwrap scalar or array roots.
- OpenAI strict mode: optional fields must already accept `null`. Never normalize `null`
  to `undefined` — provider output and Zod validation would disagree.
- Conversion changes must hold on Zod 3 and Zod 4. Locally only the installed version's
  path runs; CI pins the full matrix. See `.agents/skills/conversion-compat/SKILL.md`.
- No secrets, API keys, private prompts, or customer data anywhere: tests, examples,
  fixtures, docs. Everything here runs offline; builders make no network calls.

## Releases Happen From Commit Messages

This repo uses semantic-release. A `fix:` or `feat:` commit pushed to main publishes a new
npm version. Use `docs:`, `test:`, `ci:`, `chore:`, or `refactor:` for anything that should
not release. Never label a change `fix:` for convention's sake — that word ships a package.

## Before Finishing

1. `pnpm check` passes.
2. Conversion changes: both Zod fixture suites cover the new behavior.
3. Provider shape changes: snapshot diffs reviewed, not blindly accepted.
4. Public API changes: README updated in the same change.
5. Examples still typecheck and smoke-run if their surface changed.

## Skills

- `.agents/skills/add-provider/SKILL.md` — adding or changing a provider target.
- `.agents/skills/conversion-compat/SKILL.md` — touching conversion or emitted JSON Schema.

`CONTRIBUTING.md` holds the full contributor policy. `HANDOFF.md` tracks deferred
follow-ups; check it before starting larger work.
