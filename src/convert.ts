import { createRequire } from 'node:module';
import * as zod from 'zod';

import type { Diagnostics, JsonSchemaObject, ZodObjectSchema } from './types.js';
import type { zodToJsonSchema as zodToJsonSchemaType } from 'zod-to-json-schema';

// Resolved lazily so the package works whether the consumer is on Zod 3 or 4.
const zodNamespace = zod as unknown as {
  toJSONSchema?: (schema: unknown, options?: Record<string, unknown>) => Record<string, unknown>;
  ZodObject?: new (...args: never[]) => unknown;
};
const require = createRequire(import.meta.url);
let cachedZodToJsonSchema: typeof zodToJsonSchemaType | undefined;

const UNSUPPORTED_MESSAGE =
  'zod-ai-tool: schema contains a construct (.transform/.pipe/.preprocess/.refine) that does ' +
  'not round-trip cleanly to JSON Schema. The generated schema reflects the model-INPUT shape, ' +
  'not the post-transform output. Validate model output with the original Zod schema at runtime.';

/** True when the value looks like a Zod schema instance (Zod 3 or 4). */
function isSchemaLike(value: unknown): value is { _def?: Record<string, unknown>; shape?: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('_def' in value || '~standard' in value)
  );
}

/** True when the schema is a root Zod object. Works across Zod 3 and Zod 4. */
export function isZodObject(schema: unknown): boolean {
  const ZodObject = zodNamespace.ZodObject;
  if (ZodObject && schema instanceof ZodObject) {
    return true;
  }
  // Fallback: ZodObject exposes a `shape` in both major versions.
  return (
    isSchemaLike(schema) &&
    typeof (schema as { shape?: unknown }).shape === 'object' &&
    (schema as { shape?: unknown }).shape !== null
  );
}

/** True when a single schema node is an unsupported construct. */
function isUnsupportedNode(node: { _def?: Record<string, unknown> }): boolean {
  const def = node._def;
  if (!def) {
    return false;
  }
  // Zod 3: transforms/refines/preprocess are ZodEffects; .pipe() is ZodPipeline.
  if (def.typeName === 'ZodEffects' || def.typeName === 'ZodPipeline') {
    return true;
  }
  if (typeof (def.effect as { type?: unknown } | undefined)?.type === 'string') {
    return true;
  }
  // Zod 4: .transform()/.pipe()/.preprocess() all surface as a `pipe` node.
  if (def.type === 'transform' || def.type === 'pipe' || def.type === 'preprocess') {
    return true;
  }
  // Zod 4: .refine()/.superRefine() stay on the base type as a `custom` check
  // rather than a wrapper node — its constraint cannot be expressed in JSON Schema.
  const checks = def.checks as Array<{ _zod?: { def?: { check?: unknown } } }> | undefined;
  if (Array.isArray(checks) && checks.some((c) => c?._zod?.def?.check === 'custom')) {
    return true;
  }
  return false;
}

/** Best-effort walk of the schema tree looking for unsupported constructs. */
function containsUnsupportedConstruct(schema: unknown): boolean {
  const seen = new WeakSet<object>();

  const walk = (node: unknown, depth: number): boolean => {
    if (!isSchemaLike(node) || depth > 12) {
      return false;
    }
    if (seen.has(node as object)) {
      return false;
    }
    seen.add(node as object);

    if (isUnsupportedNode(node)) {
      return true;
    }

    // Object fields live on the public `shape` (a getter in v3, a value in v4).
    try {
      const shape = (node as { shape?: unknown }).shape;
      if (shape && typeof shape === 'object') {
        for (const value of Object.values(shape as Record<string, unknown>)) {
          if (walk(value, depth + 1)) {
            return true;
          }
        }
      }
      /* v8 ignore next 3 -- defensive: accessing `shape` on exotic nodes can throw */
    } catch {
      // Accessing `shape` on some node types can throw; ignore and continue.
    }

    // Generic scan of `_def` for nested schemas (innerType, element, options, ...).
    const def = (node as { _def?: Record<string, unknown> })._def;
    if (def) {
      for (const value of Object.values(def)) {
        if (isSchemaLike(value)) {
          if (walk(value, depth + 1)) {
            return true;
          }
        } else if (Array.isArray(value)) {
          for (const item of value) {
            if (isSchemaLike(item) && walk(item, depth + 1)) {
              return true;
            }
          }
        }
      }
    }

    return false;
  };

  try {
    return walk(schema, 0);
    /* v8 ignore next 3 -- defensive: walk is wrapped so detection never throws */
  } catch {
    return false;
  }
}

/** Report unsupported constructs according to the chosen diagnostics mode. */
export function reportUnsupported(schema: unknown, diagnostics: Diagnostics): void {
  if (diagnostics === 'silent') {
    return;
  }
  if (!containsUnsupportedConstruct(schema)) {
    return;
  }
  if (diagnostics === 'throw') {
    throw new Error(UNSUPPORTED_MESSAGE);
  }
  console.warn(UNSUPPORTED_MESSAGE);
}

/* v8 ignore start -- Zod 3-only fallback; covered by the matching CI matrix cells */
function getZodToJsonSchema(): typeof zodToJsonSchemaType {
  cachedZodToJsonSchema ??= (
    require('zod-to-json-schema') as {
      zodToJsonSchema: typeof zodToJsonSchemaType;
    }
  ).zodToJsonSchema;
  return cachedZodToJsonSchema;
}
/* v8 ignore stop */

/**
 * Run the underlying Zod -> JSON Schema conversion for the installed Zod version.
 *
 * Exactly one branch runs per environment; the other is unreachable on that Zod
 * major. Both are exercised by the CI matrix (zod 3/4) and the `zod3`/`zod4`
 * fixture tests, so each branch is ignored for single-run coverage accounting.
 */
function rawConvert(schema: ZodObjectSchema): Record<string, unknown> {
  /* v8 ignore start -- version-gated; covered by the matching CI matrix cell */
  if (typeof zodNamespace.toJSONSchema === 'function') {
    // Zod 4 built-in. `io: 'input'` yields the pre-transform shape the model produces;
    // `unrepresentable: 'any'` keeps unsupported constructs from throwing. Zod 4.0
    // expects `draft-7`; newer releases normalize it to `draft-07`.
    return zodNamespace.toJSONSchema(schema, {
      target: 'draft-7',
      io: 'input',
      unrepresentable: 'any',
    });
  }
  // Zod 3 fallback via the `zod-to-json-schema` library.
  return getZodToJsonSchema()(schema as never, {
    target: 'jsonSchema7',
    $refStrategy: 'none',
  }) as Record<string, unknown>;
  /* v8 ignore stop */
}

/**
 * Convert a root Zod object schema to a provider-ready JSON Schema object.
 *
 * - Throws if the schema is not a root Zod object (no magical unwrapping).
 * - Strips `$schema` and the top-level `additionalProperties` (loose output).
 * - Guarantees a `required` array is always present.
 */
export function zodObjectToJsonSchema(
  schema: ZodObjectSchema,
  diagnostics: Diagnostics = 'warn',
): JsonSchemaObject {
  if (!isZodObject(schema)) {
    throw new Error(
      'zod-ai-tool: AI tool schemas must be root Zod objects. ' +
        'Wrap scalar input as z.object({ value: z.string() }).',
    );
  }

  reportUnsupported(schema, diagnostics);

  const raw = rawConvert(schema);
  const out: Record<string, unknown> = { ...raw };

  delete out.$schema;
  // Top-level only — nested `additionalProperties` is left untouched.
  delete out.additionalProperties;

  out.type = 'object';
  if (!Array.isArray(out.required)) {
    out.required = [];
  }

  return out as JsonSchemaObject;
}
