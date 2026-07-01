# zod-ai-tool

[![CI](https://github.com/connordibble/zod-ai-tool/actions/workflows/ci.yml/badge.svg)](https://github.com/connordibble/zod-ai-tool/actions/workflows/ci.yml)
[![coverage: 95%+](https://img.shields.io/badge/coverage-95%25%2B-brightgreen.svg)](https://github.com/connordibble/zod-ai-tool/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/zod-ai-tool.svg)](https://www.npmjs.com/package/zod-ai-tool)
[![license: MIT](https://img.shields.io/npm/l/zod-ai-tool.svg)](./LICENSE)

Build Anthropic, OpenAI, and Gemini tool definitions from one Zod schema, then use that
same schema to validate the model's tool input.

This package extracts one boundary from ResearchLog, an R&D evidence system where model
output must pass a contract before it can be written to the database. The surrounding design
is described in
[*When the Model Is a Draft, Not the Source of Truth*](https://connordibble.dev/writing/when-the-model-is-a-draft).

## The Problem

When you call a model with tool use, you give it a schema describing the shape you expect
back (`input_schema` for Anthropic, `parameters` for OpenAI, or a function declaration for
Gemini). You also need a Zod schema to validate that output at runtime before it touches your
database.

Write those separately and they drift. The tool definition says `confidence` is `0–100`; the
Zod schema doesn't cap it. A `category` enum gains a value in one place but not the other.
Nothing crashes. The contract has split in two.

`zod-ai-tool` keeps the provider schema and runtime validator at one callsite. The Zod schema
is the source, and the provider objects are derived from it. That is the whole package.

## Installation

```bash
pnpm add zod-ai-tool zod
```

`zod` is the only peer dependency. The package defines its provider types locally, so provider
SDKs are not required at runtime. Development tests check Anthropic and OpenAI local types
against the current SDK types.

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
  gemini,            // Gemini function declaration
  validate,          // (input: unknown) => z.infer<typeof schema>; throws on invalid
  safeParse,         // (input: unknown) => Zod SafeParseReturn; never throws
  schema,            // the original Zod schema
}
```

## Provider Builders

If you only want a provider tool object, use the builders directly.

```typescript
import {
  toAnthropicTool,
  toGeminiFunctionDeclaration,
  toOpenAIFunction,
  toOpenAIResponsesTool,
} from 'zod-ai-tool';

const anthropicTool = toAnthropicTool({ name, description, schema });          // Messages API
const openaiChatTool = toOpenAIFunction({ name, description, schema });        // Chat Completions
const openaiResponsesTool = toOpenAIResponsesTool({ name, description, schema }); // Responses API
const geminiDeclaration = toGeminiFunctionDeclaration({ name, description, schema }); // Gemini
```

OpenAI uses two tool shapes: the Chat Completions API nests the function under a `function`
key; the Responses API uses a flat shape. This package provides both.

Gemini accepts function declarations inside a `functionDeclarations` array. This package
returns the declaration and leaves SDK configuration and function-calling modes to your app.
The schema is emitted under `parametersJsonSchema`, which accepts standard JSON Schema
(supported by `@google/genai`). The legacy `parameters` field only accepts Gemini's restricted
OpenAPI subset and rejects keywords this package emits for common Zod types — `const` for
`z.literal`, `additionalProperties` for `z.record`, tuple-style `items` for `z.tuple`.

## Why This Exists

`openai` ships a `zodFunction()` helper and the Vercel AI SDK accepts a Zod schema as
`inputSchema`. Those are good choices inside their respective stacks. This package covers the
narrower case where an application talks to Anthropic, OpenAI, or Gemini directly and wants
one validation contract without adopting a larger AI framework.

It converts schemas and validates input. It stays small on purpose.

## Scope

- It does not call a provider API. You bring your own SDK client.
- It does not parse responses beyond Zod validation. `validate` and `safeParse` call
  `schema.parse` and `schema.safeParse`.
- It does not orchestrate tool-call loops or streams.
- It does not enable OpenAI strict mode unless you opt in with `strict: true`.

## Peer Dependency

| Package | Range                  | Used for                              |
| ------- | ---------------------- | ------------------------------------- |
| `zod`   | `^3.25.28 \|\| ^4.0.0` | Schema definition + runtime validation |

Both Zod 3 and Zod 4 are supported. On Zod 4 the built-in `z.toJSONSchema()` is used; on
Zod 3 the package lazily falls back to
[`zod-to-json-schema`](https://www.npmjs.com/package/zod-to-json-schema).

## Loose By Default

This package emits loose, provider-shaped JSON Schema by default. Responses API tools
explicitly set `strict: false`; Chat Completions remains non-strict by default.

The cost is weaker provider-side enforcement. Validate every tool input with the original Zod
schema before using or persisting it.

## OpenAI Strict Mode

Pass `strict: true` to emit OpenAI strict-mode schemas:

```typescript
const tool = toOpenAIResponsesTool({
  name,
  description,
  schema: z.object({
    required_value: z.string(),
    optional_value: z.string().nullable().optional(),
  }),
  strict: true,
});
```

Strict mode affects OpenAI builders only. It sets `additionalProperties: false` on object
schemas, marks every property as required, and sets the provider tool's `strict` flag. Because
OpenAI represents optional values with `null`, optional fields must already accept `null` in
the Zod schema. A plain `z.string().optional()` field throws under `strict: true`; use
`.nullable().optional()` or `.nullish()` instead. (`.default()` also makes a field optional in
the input schema, so it is subject to the same rule.)

```typescript
// Throws under `strict: true`
z.object({ optional_value: z.string().optional() });

// Accepted under `strict: true`
z.object({ optional_value: z.string().nullable().optional() });
```

Open objects — `z.record(...)`, `.catchall(...)`, `.passthrough()` — cannot be represented in
strict mode, which forces `additionalProperties: false` on every object. They throw under
`strict: true` rather than silently emitting a schema that forbids every key.

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

The root schema must be a Zod object because providers require object-shaped tool input.
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

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for local setup, compatibility rules, testing
expectations, and release conventions.

## License

MIT
