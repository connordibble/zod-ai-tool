# zod-ai-tool

[![CI](https://github.com/connordibble/zod-ai-tool/actions/workflows/ci.yml/badge.svg)](https://github.com/connordibble/zod-ai-tool/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/zod-ai-tool.svg)](https://www.npmjs.com/package/zod-ai-tool)
[![license: MIT](https://img.shields.io/npm/l/zod-ai-tool.svg)](./LICENSE)

Derive Anthropic and OpenAI tool definitions from a Zod schema — one source, no drift.

## The problem

When you call a model with tool use, you give it a schema describing the shape you expect
back (`input_schema` for Anthropic, `parameters` for OpenAI). You also need a Zod schema to
validate that output at runtime before it touches your database.

Write those separately and they drift. The tool definition says `confidence` is `0–100`; the
Zod schema doesn't cap it. A `category` enum gains a value in one place but not the other.
These mismatches don't throw — they silently produce unvalidated data the rest of your system
treats as trusted.

The fix is to treat the Zod schema as the single definition and derive everything else from
it. That's all this package does.

## Install

```bash
pnpm add zod-ai-tool zod
```

`zod` is a peer dependency. The Anthropic and OpenAI SDKs are **not** required — this package
imports their types only, and ships its own structurally-compatible types so nothing breaks
if you have neither installed.

## `defineAITool` — the pattern

Lead with this. It keeps the tool definition and the validator coupled at one callsite, so
they cannot drift.

```typescript
import { z } from 'zod';
import { defineAITool } from 'zod-ai-tool';

const ClassificationSchema = z.object({
  qualifies: z.boolean(),
  confidence: z.number().int().min(0).max(100),
  narrative: z.string().max(500),
  category: z.enum(['research', 'development', 'other']),
  disqualifiers: z.array(z.string()).max(5),
});

const classificationTool = defineAITool({
  name: 'classify_activity',
  description: 'Classify an engineering activity against IRS R&D criteria.',
  schema: ClassificationSchema,
});

// Use the tool definition in the API call.
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  tools: [classificationTool.anthropic],
  messages: [{ role: 'user', content: prompt }],
});

// Parse the result with the SAME schema — same source, guaranteed alignment.
const toolInput = response.content.find((block) => block.type === 'tool_use')?.input;
const parsed = classificationTool.validate(toolInput); // throws ZodError if malformed
```

`defineAITool` returns a plain object:

```typescript
{
  anthropic,         // Anthropic tool definition (Messages API)
  openai,            // OpenAI tool definition (Chat Completions API)
  openaiResponses,   // OpenAI tool definition (Responses API, flat shape)
  validate,          // (input: unknown) => z.infer<typeof schema>  — throws on invalid
  safeParse,         // (input: unknown) => Zod SafeParseReturn      — never throws
  schema,            // the original Zod schema
}
```

## Escape hatches — just the conversion

If you only want a provider tool object, use the builders directly.

```typescript
import { toAnthropicTool, toOpenAIFunction, toOpenAIResponsesTool } from 'zod-ai-tool';

const anthropicTool = toAnthropicTool({ name, description, schema });          // Messages API
const openaiChatTool = toOpenAIFunction({ name, description, schema });        // Chat Completions
const openaiResponsesTool = toOpenAIResponsesTool({ name, description, schema }); // Responses API
```

OpenAI uses two tool shapes: the Chat Completions API nests the function under a `function`
key; the Responses API uses a flat shape. This package provides both.

## Why this exists

`openai` ships a `zodFunction()` helper and the Vercel AI SDK accepts a Zod schema as
`inputSchema`. This package is for the case where you **don't** want a full AI framework,
**don't** want a runtime dependency on the OpenAI or Anthropic SDKs, and want the *same* Zod
schema to produce provider-shaped tool definitions while remaining your runtime validator.
That's the whole niche.

This pattern is extracted from production code in ResearchLog and described in
[*When the model is a draft*](https://connordibble.dev/writing/when-the-model-is-a-draft) —
the "contract lives in one place" section.

## What it does NOT do

- It does not call the API. You bring your own SDK client.
- It does not handle response parsing beyond Zod validation. `validate`/`safeParse` are just
  `schema.parse`/`schema.safeParse`.
- It does not support streaming tool use.
- It does not generate strict-mode schemas (see below).

## Peer dependencies

| Package            | Range      | Required? | Used for                              |
| ------------------ | ---------- | --------- | ------------------------------------- |
| `zod`              | `>=3.0.0`  | Yes       | Schema definition + runtime validation |
| `@anthropic-ai/sdk`| any        | Optional  | Types only (`import type`)            |
| `openai`           | any        | Optional  | Types only (`import type`)            |

Both Zod 3 and Zod 4 are supported. On Zod 4 the built-in `z.toJSONSchema()` is used; on
Zod 3 the package falls back to [`zod-to-json-schema`](https://www.npmjs.com/package/zod-to-json-schema).

## Scope: loose, not strict

This package emits **loose**, provider-shaped JSON Schema and does not set `strict: true`. It
does not guarantee OpenAI strict-mode compatibility (which requires `additionalProperties:
false`, every field listed in `required`, and optional fields modeled as nullable) — that is
planned as an additive, opt-in feature. Validate model output with the Zod schema at runtime
regardless — that is the durable guarantee.

## Unsupported Zod constructs

The output JSON Schema reflects the schema's **input** shape, not any post-transform output.
These constructs do not round-trip cleanly and are converted best-effort:

- `.transform()`
- `.pipe()`
- `.preprocess()`
- `.refine()` / `.superRefine()`

By default the package emits a single `console.warn` when it detects one. Control this with
the `diagnostics` option:

```typescript
defineAITool({ name, description, schema, diagnostics: 'silent' }); // 'silent' | 'warn' | 'throw'
```

The root schema must be a Zod object — both providers require object-shaped tool input.
Passing a scalar or array root throws a clear error; wrap it as `z.object({ value: … })`.

## Versioning & releases

Releases are fully automated with [semantic-release](https://semantic-release.gitbook.io/).
Every push to `main` runs the CI matrix (Node 20/22 × Zod 3/4); once it passes,
[Conventional Commits](https://www.conventionalcommits.org/) determine the next version:

| Commit type                         | Release |
| ----------------------------------- | ------- |
| `fix:`                              | patch   |
| `feat:`                             | minor   |
| `feat!:` / `BREAKING CHANGE:` footer | major   |

semantic-release then bumps the version, updates [`CHANGELOG.md`](./CHANGELOG.md), publishes to
npm with [provenance](https://docs.npmjs.com/generating-provenance-statements), and cuts a
[GitHub Release](https://github.com/connordibble/zod-ai-tool/releases). Other commit types
(`chore`, `docs`, `test`, `ci`, `refactor`) do not trigger a release. Follow the same commit
convention in PRs so the version bump stays accurate.

## License

MIT
