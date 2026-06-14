import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { toOpenAIFunction } from '../src/openai.js';

const Schema = z.object({
  qualifies: z.boolean(),
  category: z.enum(['research', 'development', 'other']),
});

describe('toOpenAIFunction (Chat Completions)', () => {
  it('produces the nested function tool shape', () => {
    const tool = toOpenAIFunction({
      name: 'classify_activity',
      description: 'Classify an engineering activity.',
      schema: Schema,
    });

    expect(tool.type).toBe('function');
    expect(tool.function.name).toBe('classify_activity');
    expect(tool.function.description).toBe('Classify an engineering activity.');
    expect(tool.function.parameters.type).toBe('object');
    expect(tool.function.parameters.properties).toHaveProperty('qualifies');
  });

  it('matches a stable snapshot', () => {
    expect(toOpenAIFunction({ name: 'classify_activity', description: 'd', schema: Schema })).toMatchSnapshot();
  });
});
