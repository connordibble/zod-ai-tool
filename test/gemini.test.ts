import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { toGeminiFunctionDeclaration } from '../src/gemini.js';

const Schema = z.object({
  qualifies: z.boolean(),
  confidence: z.number().int().min(0).max(100),
});

describe('toGeminiFunctionDeclaration', () => {
  it('produces a Gemini function declaration', () => {
    const declaration = toGeminiFunctionDeclaration({
      name: 'classify_activity',
      description: 'Classify an engineering activity.',
      schema: Schema,
    });

    expect(declaration.name).toBe('classify_activity');
    expect(declaration.description).toBe('Classify an engineering activity.');
    expect(declaration.parameters.type).toBe('object');
    expect(declaration.parameters.properties).toHaveProperty('qualifies');
    expect(declaration.parameters.properties).toHaveProperty('confidence');
    expect(declaration.parameters.required).toEqual(['qualifies', 'confidence']);
  });

  it('matches a stable snapshot', () => {
    expect(toGeminiFunctionDeclaration({ name: 'classify_activity', description: 'd', schema: Schema })).toMatchSnapshot();
  });
});
