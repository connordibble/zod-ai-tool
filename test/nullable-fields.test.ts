import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { zodObjectToJsonSchema } from '../src/convert.js';

describe('nullable fields', () => {
  it('represents null as an allowed value (version-tolerant)', () => {
    const schema = zodObjectToJsonSchema(
      z.object({
        maybe: z.string().nullable(),
      }),
    );

    const maybe = (schema.properties as Record<string, unknown>).maybe;
    // Zod 3 and 4 differ (type array vs anyOf), so assert on the serialized shape.
    expect(JSON.stringify(maybe)).toContain('null');
  });
});
