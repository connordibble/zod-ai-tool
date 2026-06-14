import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { toAnthropicTool } from '../src/anthropic.js';

const Schema = z.object({
  qualifies: z.boolean(),
  confidence: z.number().int().min(0).max(100),
});

describe('toAnthropicTool', () => {
  it('produces a valid Anthropic tool object', () => {
    const tool = toAnthropicTool({
      name: 'classify_activity',
      description: 'Classify an engineering activity.',
      schema: Schema,
    });

    expect(tool.name).toBe('classify_activity');
    expect(tool.description).toBe('Classify an engineering activity.');
    expect(tool.input_schema.type).toBe('object');
    expect(tool.input_schema.properties).toHaveProperty('qualifies');
    expect(tool.input_schema.properties).toHaveProperty('confidence');
    expect(Array.isArray(tool.input_schema.required)).toBe(true);
  });

  it('does not leak $schema into input_schema', () => {
    const tool = toAnthropicTool({ name: 'x', description: 'y', schema: Schema });
    expect(tool.input_schema).not.toHaveProperty('$schema');
  });

  it('matches a stable snapshot', () => {
    expect(toAnthropicTool({ name: 'classify_activity', description: 'd', schema: Schema })).toMatchSnapshot();
  });
});
