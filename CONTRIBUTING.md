# Contributing

Thanks for taking the time to improve `zod-ai-tool`.

This package is intentionally small. The job is to derive provider tool definitions from a
Zod object schema and validate model tool input with that same schema. Contributions are most
useful when they preserve that boundary.

## What Fits

Good contributions usually fall into one of these buckets:

- Provider shape support for direct tool-use APIs.
- Zod conversion compatibility across supported Zod versions.
- Runtime validation behavior that keeps the Zod schema as the source of truth.
- Type compatibility with provider SDKs without adding runtime SDK dependencies.
- Documentation, examples, and tests that make the tradeoffs clearer.

Changes are usually out of scope when they turn this package into an SDK wrapper, agent
runtime, tool-call loop, stream parser, or orchestration framework. Those are real problems,
but this package should stay focused on conversion and validation.

## Conduct

Be precise and respectful. Disagreement is normal, especially around scope. Keep it tied to
behavior, compatibility, maintenance cost, and user impact.

Do not post credentials, private prompts, provider API keys, customer data, or proprietary
schemas in issues, pull requests, tests, examples, or fixtures.

## Local Setup

Use the package manager pinned in `package.json`:

```bash
pnpm install
```

Useful commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

Before opening a pull request, run the full set when practical. At minimum, run the checks
that cover the files you changed and say what you ran in the PR.

## Compatibility Contract

The package supports:

- Node `>=20`
- Zod `^3.25.28 || ^4.0.0`
- ESM and CommonJS consumers

CI tests Node 20, 22, and 24 against the minimum and current supported Zod 3 and Zod 4
releases. A change that passes only the locally installed Zod version is not enough if it
touches conversion behavior.

Provider SDKs should stay out of runtime dependencies. Local provider types are allowed, and
type-compat tests can assert assignability to SDK types in development. If a new provider SDK
dependency is proposed for tests, keep it in `devDependencies` and explain what drift it
catches.

## API Design Rules

Keep public APIs boring and explicit:

- The root schema must remain a Zod object. Do not unwrap scalar or array roots.
- Builders should return provider-ready objects with no hidden network calls.
- `defineAITool` should stay a plain object that couples provider definitions with
  `validate`, `safeParse`, and the original schema.
- New provider support should add a narrow builder first. Avoid registry or dispatch helpers
  unless the package is deliberately taking on that scope.
- Do not add a runtime dependency on Anthropic, OpenAI, Gemini, or another provider SDK.

OpenAI strict mode has one extra invariant: optional fields must already accept `null`.
Do not silently normalize `null` to `undefined`, because that would make provider output and
Zod validation disagree.

## Testing Expectations

Tests should match the risk of the change.

For conversion changes, cover:

- Zod 3 and Zod 4 behavior when possible.
- Required and optional fields.
- Nullable fields.
- Nested objects and arrays.
- Unsupported Zod constructs that need diagnostics.

For provider builders, cover:

- The exact provider object shape.
- Snapshot stability when the shape is easy to review.
- Root non-object rejection.
- Public exports.
- SDK type compatibility when a provider SDK is already a dev dependency.

Examples are part of the package contract. Keep them typechecked and smoke-run when their
shape changes.

## Documentation Expectations

Update the README when a change affects:

- Public API names or return shapes.
- Provider support.
- Validation behavior.
- Install requirements.
- Strict-mode or compatibility tradeoffs.

Prefer honest tradeoff notes over reassuring prose. If a provider-side schema is weaker than
runtime Zod validation, say that plainly and tell users to validate before using model output.

## Issues

For bugs, include:

- The package version.
- Node version.
- Zod version.
- Provider surface, for example Anthropic Messages, OpenAI Responses, or Gemini function
  declarations.
- A minimal Zod schema that reproduces the behavior.
- Expected output, actual output, and any error text.

For feature requests, include the concrete workflow and the boundary you think this package
should own. Provider schema links are helpful when the request depends on a specific API
shape.

## Pull Requests

Keep pull requests narrow. A good PR has one behavioral purpose and a test story that matches
it.

Include:

- What changed.
- Why it belongs in this package.
- Any public API impact.
- What checks you ran.
- Any compatibility risk for Zod 3, Zod 4, ESM, CommonJS, or provider SDK types.

If you are unsure whether a larger feature fits, open an issue first with the concrete user
workflow and the proposed boundary.

## Commit and Release Conventions

This repository uses semantic-release and Conventional Commits.

Use:

- `fix:` for patch releases.
- `feat:` for minor releases.
- `feat!:` or a `BREAKING CHANGE:` footer for major releases.
- `docs:`, `test:`, `ci:`, `chore:`, or `refactor:` for changes that should not publish a
  package release by themselves.

Every push to `main` runs CI. If the commit history includes a release-triggering commit and
CI passes, semantic-release publishes the next npm version with provenance and updates the
changelog.

## Security and Sensitive Reports

Do not put credentials, private prompts, provider API keys, or customer data in issues,
tests, examples, or fixtures.

If a report is security-sensitive, avoid posting exploit details in a public issue. Use
GitHub private vulnerability reporting if it is available for the repository, or contact the
author listed in `package.json`.

## Maintenance Notes

`HANDOFF.md` tracks deferred follow-ups that are worth remembering but not yet committed to a
release. Check it before starting larger work.
