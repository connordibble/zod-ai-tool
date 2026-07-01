# Handoff

## Deferred follow-ups

- Revisit the Zod 3 fallback loader if browser or edge bundling becomes a goal. `createRequire` is now deferred to the Zod 3-only path (Zod 4 consumers never execute it), but the module still statically imports `node:module`, which non-Node bundlers must shim or externalize.
- Add Gemini SDK type-compat coverage if we decide the extra `@google/genai` dev dependency is worth it. The current Gemini shape is intentionally local and declaration-only.
