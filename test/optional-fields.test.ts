import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { zodObjectToJsonSchema } from '../src/convert.js';

describe('optional fields', () => {
  const schema = zodObjectToJsonSchema(
    z.object({
      required_field: z.string(),
      optional_field: z.string().optional(),
    }),
  );

  it('keeps optional fields in properties', () => {
    expect(schema.properties).toHaveProperty('required_field');
    expect(schema.properties).toHaveProperty('optional_field');
  });

  it('excludes optional fields from required', () => {
    expect(schema.required).toContain('required_field');
    expect(schema.required).not.toContain('optional_field');
  });
});
