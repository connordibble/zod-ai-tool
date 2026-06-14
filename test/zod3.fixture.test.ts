import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { zodObjectToJsonSchema } from '../src/convert.js';
import { isZod4 } from './zod-version.js';

// Runs only on the Zod 3 code path (zod-to-json-schema fallback).
describe.runIf(!isZod4)('Zod 3 conversion path', () => {
  it('uses zod-to-json-schema and yields normalized provider output', () => {
    const schema = zodObjectToJsonSchema(
      z.object({
        name: z.string().min(1).max(50),
        count: z.number().int().min(0),
        kind: z.enum(['a', 'b']),
      }),
    );

    expect(schema.type).toBe('object');
    expect(schema).not.toHaveProperty('$schema');
    expect(schema).not.toHaveProperty('additionalProperties');
    expect(Array.isArray(schema.required)).toBe(true);
    const kind = (schema.properties as Record<string, { enum?: unknown }>).kind;
    expect(kind.enum).toEqual(['a', 'b']);
  });
});
