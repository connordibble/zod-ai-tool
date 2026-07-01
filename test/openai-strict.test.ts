import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { toOpenAIFunction, toOpenAIResponsesTool } from '../src/openai.js';

const StrictSchema = z.object({
  title: z.string(),
  summary: z.string().nullable().optional(),
  details: z.object({
    score: z.number().int().min(0).max(100),
    note: z.string().nullable().optional(),
  }),
});

describe('OpenAI strict mode', () => {
  it('adds strict:true to Chat Completions tools and rewrites object schemas', () => {
    const tool = toOpenAIFunction({
      name: 'classify_activity',
      description: 'Classify an engineering activity.',
      schema: StrictSchema,
      strict: true,
    });

    expect(tool.function.strict).toBe(true);
    expect(tool.function.parameters.additionalProperties).toBe(false);
    expect(tool.function.parameters.required).toEqual(['title', 'summary', 'details']);

    const properties = tool.function.parameters.properties as Record<string, Record<string, unknown>>;
    expect(JSON.stringify(properties.summary)).toContain('null');

    const details = properties.details;
    expect(details.additionalProperties).toBe(false);
    expect(details.required).toEqual(['score', 'note']);
  });

  it('adds strict:true to Responses tools', () => {
    const tool = toOpenAIResponsesTool({
      name: 'classify_activity',
      description: 'Classify an engineering activity.',
      schema: StrictSchema,
      strict: true,
    });

    expect(tool.strict).toBe(true);
    expect(tool.parameters.additionalProperties).toBe(false);
    expect(tool.parameters.required).toEqual(['title', 'summary', 'details']);
  });

  it('keeps OpenAI tools loose by default', () => {
    const chatTool = toOpenAIFunction({
      name: 'classify_activity',
      description: 'Classify an engineering activity.',
      schema: StrictSchema,
    });
    const responsesTool = toOpenAIResponsesTool({
      name: 'classify_activity',
      description: 'Classify an engineering activity.',
      schema: StrictSchema,
    });

    expect(chatTool.function).not.toHaveProperty('strict');
    expect(chatTool.function.parameters).not.toHaveProperty('additionalProperties');
    expect(chatTool.function.parameters.required).toEqual(['title', 'details']);
    expect(responsesTool.strict).toBe(false);
  });

  it('throws for optional fields that do not accept null', () => {
    expect(() =>
      toOpenAIFunction({
        name: 'classify_activity',
        description: 'Classify an engineering activity.',
        schema: z.object({ title: z.string().optional() }),
        strict: true,
      }),
    ).toThrow(/requires optional fields to accept null.*parameters\.title/s);
  });

  it('throws for records instead of silently closing them', () => {
    expect(() =>
      toOpenAIResponsesTool({
        name: 'classify_activity',
        description: 'Classify an engineering activity.',
        schema: z.object({ scores: z.record(z.string(), z.number()) }),
        strict: true,
      }),
    ).toThrow(/open objects.*parameters\.properties\.scores/s);
  });

  it('allows records when strict mode is off', () => {
    const tool = toOpenAIResponsesTool({
      name: 'classify_activity',
      description: 'Classify an engineering activity.',
      schema: z.object({ scores: z.record(z.string(), z.number()) }),
    });

    const scores = (tool.parameters.properties as Record<string, Record<string, unknown>>).scores;
    expect(scores.additionalProperties).toEqual({ type: 'number' });
  });
});
