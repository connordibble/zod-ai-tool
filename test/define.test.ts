import { describe, expect, it } from 'vitest';
import { z, ZodError } from 'zod';

import { defineAITool } from '../src/define.js';

const Schema = z.object({
  qualifies: z.boolean(),
  confidence: z.number().int().min(0).max(100),
});

const tool = defineAITool({
  name: 'classify_activity',
  description: 'Classify an engineering activity.',
  schema: Schema,
});

describe('defineAITool', () => {
  it('exposes anthropic, openai, and openaiResponses definitions', () => {
    expect(tool.anthropic.input_schema.type).toBe('object');
    expect(tool.openai.function.name).toBe('classify_activity');
    expect(tool.openaiResponses.name).toBe('classify_activity');
    expect(tool.gemini.name).toBe('classify_activity');
  });

  it('exposes the original schema', () => {
    expect(tool.schema).toBe(Schema);
  });

  it('validate returns parsed data on valid input', () => {
    const parsed = tool.validate({ qualifies: true, confidence: 80 });
    expect(parsed).toEqual({ qualifies: true, confidence: 80 });
  });

  it('validate throws ZodError on invalid input', () => {
    expect(() => tool.validate({ qualifies: 'yes', confidence: 200 })).toThrow(ZodError);
  });

  it('safeParse returns success:false on invalid input without throwing', () => {
    const result = tool.safeParse({ qualifies: 'yes', confidence: 200 });
    expect(result.success).toBe(false);
  });

  it('safeParse returns success:true on valid input', () => {
    const result = tool.safeParse({ qualifies: false, confidence: 0 });
    expect(result.success).toBe(true);
  });

  it('is a plain object (no prototype methods/class)', () => {
    expect(Object.getPrototypeOf(tool)).toBe(Object.prototype);
  });

  it('threads the diagnostics option through to conversion', () => {
    expect(() =>
      defineAITool({
        name: 't',
        description: 'd',
        schema: z.object({ a: z.string().transform((s) => s.length) }),
        diagnostics: 'throw',
      }),
    ).toThrow();
  });
});
