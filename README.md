# zod-ai-tool

[![CI](https://github.com/connordibble/zod-ai-tool/actions/workflows/ci.yml/badge.svg)](https://github.com/connordibble/zod-ai-tool/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/zod-ai-tool.svg)](https://www.npmjs.com/package/zod-ai-tool)
[![license: MIT](https://img.shields.io/npm/l/zod-ai-tool.svg)](./LICENSE)

Build Anthropic and OpenAI tool definitions from one Zod schema, then use that same schema
to validate the model's tool input.

This package extracts one boundary from ResearchLog, an R&D evidence system where model
output must pass a contract before it can be written to the database. The surrounding design
is described in
[*When the Model Is a Draft, Not the Source of Truth*](https://connordibble.dev/writing/when-the-model-is-a-draft).

## The Problem

When you call a model with tool use, you give it a schema describing the shape you expect
back (`input_schema` for Anthropic, `parameters` for OpenAI). You also need a Zod schema to
validate that output at runtime before it touches your database.

Write those separately and they drift. The tool definition says `confidence` is `0–100`; the
Zod schema doesn't cap it. A `category` enum gains a value in one place but not the other.
Nothing crashes. The contract has split in two.

`zod-ai-tool` keeps the provider schema and runtime validator at one callsite. The Zod schema
is the source, and the provider objects are derived from it. That is the whole package.

## Installation

```bash
pnpm add zod-ai-tool zod
```

`zod` is the only peer dependency. The package defines its provider types locally, so the
Anthropic and OpenAI SDKs are not required. Development tests check those local types against
the current SDK types.

## One Definition

Start with `defineAITool`. It returns the provider definitions, the original schema, and two
ways to validate tool input.

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

// Send the derived tool definition to the provider.
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  tools: [classificationTool.anthropic],
  messages: [{ role: 'user', content: prompt }],
});

// Validate the result with the same schema before it reaches application data.
const toolInput = response.content.find((block) => block.type === 'tool_use')?.input;
const parsed = classificationTool.validate(toolInput); // throws ZodError if malformed
```

`defineAITool` returns a plain object:

```typescript
{
  anthropic,         // Anthropic tool definition (Messages API)
  openai,            // OpenAI tool definition (Chat Completions API)
  openaiResponses,   // OpenAI tool definition (Responses API, flat shape)
  validate,          // (input: unknown) => z.infer<typeof schema>; throws on invalid
  safeParse,         // (input: unknown) => Zod SafeParseReturn; never throws
  schema,            // the original Zod schema
}
```

## Provider Builders

If you only want a provider tool object, use the builders directly.

```typescript
import { toAnthropicTool, toOpenAIFunction, toOpenAIResponsesTool } from 'zod-ai-tool';

const anthropicTool = toAnthropicTool({ name, description, schema });          // Messages API
const openaiChatTool = toOpenAIFunction({ name, description, schema });        // Chat Completions
const openaiResponsesTool = toOpenAIResponsesTool({ name, description, schema }); // Responses API
```

OpenAI uses two tool shapes: the Chat Completions API nests the function under a `function`
key; the Responses API uses a flat shape. This package provides both.

## Why This Exists

`openai` ships a `zodFunction()` helper and the Vercel AI SDK accepts a Zod schema as
`inputSchema`. Those are good choices inside their respective stacks. This package covers the
narrower case where an application talks to Anthropic and OpenAI directly and wants one
validation contract without adopting a larger AI framework.

It converts schemas and validates input. It stays small on purpose.

## Scope

- It does not call a provider API. You bring your own SDK client.
- It does not parse responses beyond Zod validation. `validate` and `safeParse` call
  `schema.parse` and `schema.safeParse`.
- It does not orchestrate tool-call loops or streams.
- It does not generate strict-mode schemas (see below).

## Peer Dependency

| Package | Range                  | Used for                              |
| ------- | ---------------------- | ------------------------------------- |
| `zod`   | `^3.25.28 \|\| ^4.0.0` | Schema definition + runtime validation |

Both Zod 3 and Zod 4 are supported. On Zod 4 the built-in `z.toJSONSchema()` is used; on
Zod 3 the package falls back to [`zod-to-json-schema`](https://www.npmjs.com/package/zod-to-json-schema).

## Loose Schemas

This package emits loose, provider-shaped JSON Schema. Responses API tools explicitly set
`strict: false`; Chat Completions remains non-strict by default.

The cost is weaker provider-side enforcement. OpenAI strict mode requires
`additionalProperties: false`, every property in `required`, and optional values represented
as nullable. This package does not rewrite a Zod schema to meet those rules. Validate every
tool input with the original Zod schema before using or persisting it.

## Unsupported Zod Constructs

Some Zod behavior has no clean JSON Schema representation. For these constructs, the provider
schema describes the model's input shape before Zod applies any transform or custom check:

- `.transform()`
- `.pipe()`
- `.preprocess()`
- `.refine()` / `.superRefine()`

The package emits one `console.warn` when it detects one of these constructs. Control that
behavior with the `diagnostics` option:

```typescript
defineAITool({ name, description, schema, diagnostics: 'silent' }); // 'silent' | 'warn' | 'throw'
```

The root schema must be a Zod object because both providers require object-shaped tool input.
Passing a scalar or array root throws. Wrap it as `z.object({ value: z.string() })` instead.

## Versioning and Releases

Releases are fully automated with [semantic-release](https://semantic-release.gitbook.io/).
Every push to `main` runs the CI matrix across Node 20, 22, and 24, plus the minimum and
current supported releases of Zod 3 and 4. Once it passes,
[Conventional Commits](https://www.conventionalcommits.org/) determine the next version:

| Commit type                         | Release |
| ----------------------------------- | ------- |
| `fix:`                              | patch   |
| `feat:`                             | minor   |
| `feat!:` / `BREAKING CHANGE:` footer | major   |

The release job then bumps the version, updates [`CHANGELOG.md`](./CHANGELOG.md), publishes to
npm with [provenance](https://docs.npmjs.com/generating-provenance-statements), and cuts a
[GitHub Release](https://github.com/connordibble/zod-ai-tool/releases). Other commit types
(`chore`, `docs`, `test`, `ci`, `refactor`) do not trigger a release. Follow the same commit
convention in PRs so the version bump stays accurate.

## License

MIT
