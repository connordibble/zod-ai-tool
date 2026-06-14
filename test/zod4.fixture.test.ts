import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { zodObjectToJsonSchema } from '../src/convert.js';
import { isZod4 } from './zod-version.js';

// Runs only on the Zod 4 code path (built-in z.toJSONSchema).
describe.runIf(isZod4)('Zod 4 conversion path', () => {
  it('uses a JSON Schema target accepted by supported Zod 4 releases', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    zodObjectToJsonSchema(z.object({ name: z.string() }));

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('uses the built-in converter and still yields normalized provider output', () => {
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
