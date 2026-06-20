import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { toAnthropicTool } from '../src/anthropic.js';
import { defineAITool } from '../src/define.js';
import { toGeminiFunctionDeclaration } from '../src/gemini.js';
import { toOpenAIFunction, toOpenAIResponsesTool } from '../src/openai.js';

const config = (schema: unknown) => ({ name: 't', description: 'd', schema: schema as never });

describe('non-object root schemas', () => {
  it('toAnthropicTool throws', () => {
    expect(() => toAnthropicTool(config(z.string()))).toThrow(/root Zod objects/);
  });

  it('toOpenAIFunction throws', () => {
    expect(() => toOpenAIFunction(config(z.array(z.string())))).toThrow(/root Zod objects/);
  });

  it('toOpenAIResponsesTool throws', () => {
    expect(() => toOpenAIResponsesTool(config(z.number()))).toThrow(/root Zod objects/);
  });

  it('toGeminiFunctionDeclaration throws', () => {
    expect(() => toGeminiFunctionDeclaration(config(z.boolean()))).toThrow(/root Zod objects/);
  });

  it('defineAITool throws', () => {
    expect(() => defineAITool(config(z.string()))).toThrow(/root Zod objects/);
  });
});
