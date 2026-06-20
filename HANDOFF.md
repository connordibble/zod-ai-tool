# Handoff

## Deferred follow-ups

- Revisit the Zod 3 fallback loader if browser or edge bundling becomes a goal. The current implementation avoids a top-level `zod-to-json-schema` import and keeps the sync API, but it still relies on Node's `createRequire`.
- Add Gemini SDK type-compat coverage if we decide the extra `@google/genai` dev dependency is worth it. The current Gemini shape is intentionally local and declaration-only.
