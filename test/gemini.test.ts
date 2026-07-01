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
    expect(declaration.parametersJsonSchema.type).toBe('object');
    expect(declaration.parametersJsonSchema.properties).toHaveProperty('qualifies');
    expect(declaration.parametersJsonSchema.properties).toHaveProperty('confidence');
    expect(declaration.parametersJsonSchema.required).toEqual(['qualifies', 'confidence']);
  });

  it('emits parametersJsonSchema, not the restricted legacy parameters field', () => {
    const declaration = toGeminiFunctionDeclaration({
      name: 'classify_activity',
      description: 'Classify an engineering activity.',
      schema: Schema,
    });

    expect(declaration).not.toHaveProperty('parameters');
    expect(declaration).toHaveProperty('parametersJsonSchema');
  });

  it('matches a stable snapshot', () => {
    expect(toGeminiFunctionDeclaration({ name: 'classify_activity', description: 'd', schema: Schema })).toMatchSnapshot();
  });
});
