import { describe, expect, it } from 'vitest';

import { toOpenAIStrictJsonSchema } from '../src/openai-strict.js';

describe('toOpenAIStrictJsonSchema', () => {
  it('accepts optional properties that allow null in different JSON Schema shapes', () => {
    const strict = toOpenAIStrictJsonSchema({
      type: 'object',
      properties: {
        const_null: { const: null },
        enum_null: { enum: ['x', null] },
        one_of_null: { oneOf: [{ type: 'string' }, { type: 'null' }] },
        rows: {
          type: 'array',
          items: {
            type: 'object',
            properties: { value: { type: 'string' } },
            required: ['value'],
          },
        },
      },
      required: ['rows'],
    });

    expect(strict.required).toEqual(['const_null', 'enum_null', 'one_of_null', 'rows']);
    const rows = (strict.properties as Record<string, { items?: Record<string, unknown> }>).rows;
    expect(rows.items?.additionalProperties).toBe(false);
  });

  it('throws when an optional property schema does not allow null', () => {
    expect(() =>
      toOpenAIStrictJsonSchema({
        type: 'object',
        properties: { bad: 'not-a-schema' },
        required: [],
      }),
    ).toThrow(/parameters\.bad/);
  });
});
