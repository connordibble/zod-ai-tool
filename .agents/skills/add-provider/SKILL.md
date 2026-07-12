---
name: add-provider
description: Add a new provider tool-definition target to zod-ai-tool, or change the output shape of an existing builder, without taking on SDK dependencies.
---

# Adding or Changing a Provider Target

## When to Use This

A new provider surface needs support (a new API's tool-definition shape), or an existing
builder's output shape has to change because the provider changed theirs.

## The Boundary First

A provider target here is a pure function from a Zod object schema to a provider-ready
plain object. No network calls, no client construction, no SDK import. If the work seems
to need an SDK at runtime, the work is out of scope for this package — stop and flag it.

## Steps

1. **Local types.** Add the provider's tool-definition shape to `src/types.ts` as local
   types, copied from the provider's API reference. Do not import the SDK's types.
2. **Narrow builder.** Create `src/<provider>.ts` exporting one builder that takes the
   schema (plus name/description) and returns the provider object. Follow
   `src/anthropic.ts` as the template — it is the smallest.
3. **Wire exports.** Add named exports to `src/index.ts`. If the shape belongs on the
   coupled object, extend `defineAITool` in `src/define.ts` and its `AITool` interface.
4. **Tests.** Cover, in order of importance:
   - exact provider object shape (see `test/anthropic.test.ts`),
   - root non-object rejection (see `test/root-not-object.test.ts`),
   - public export presence (see `test/index.test.ts`),
   - a snapshot only when the shape is easy to review (see `test/__snapshots__/`),
   - SDK type-compat **only if** that SDK is already a dev dependency (see
     `test/sdk-type-compat.test.ts`). Gemini deliberately has no SDK compat test —
     `HANDOFF.md` records that decision. Do not add a new SDK dev dependency without
     flagging it.
5. **Example.** Add `examples/<provider>-basic.ts`. Examples are smoke-run by
   `test/examples-smoke.test.ts`, so a broken example fails the gate.
6. **README.** Document the new surface and its tradeoffs honestly. If the provider-side
   schema expresses less than the Zod schema validates, say so and tell users to validate
   model output before using it.

## Gotchas

- OpenAI is three surfaces, not one: Chat Completions (`toOpenAIFunction`), Responses
  (`toOpenAIResponsesTool`), and strict mode (`src/openai-strict.ts`). Know which one the
  change targets.
- Strict mode invariant: optional fields must already accept `null`. Never normalize
  `null` to `undefined` to make a schema strict-compatible.
- Finish with `pnpm check`.
