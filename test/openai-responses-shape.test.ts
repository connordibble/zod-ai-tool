import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { toOpenAIResponsesTool } from '../src/openai.js';

const Schema = z.object({
  qualifies: z.boolean(),
});

describe('toOpenAIResponsesTool (Responses API)', () => {
  it('produces the flat function tool shape', () => {
    const tool = toOpenAIResponsesTool({
      name: 'classify_activity',
      description: 'Classify an engineering activity.',
      schema: Schema,
    });

    expect(tool.type).toBe('function');
    expect(tool.name).toBe('classify_activity');
    expect(tool.description).toBe('Classify an engineering activity.');
    expect(tool.parameters.type).toBe('object');
    // Flat shape: no nested `function` wrapper.
    expect(tool).not.toHaveProperty('function');
  });

  it('matches a stable snapshot', () => {
    expect(toOpenAIResponsesTool({ name: 'classify_activity', description: 'd', schema: Schema })).toMatchSnapshot();
  });
});
