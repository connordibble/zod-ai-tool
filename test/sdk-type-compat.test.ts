import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type Anthropic from '@anthropic-ai/sdk';
import type OpenAI from 'openai';

import { defineAITool } from '../src/define.js';

const tool = defineAITool({
  name: 'classify_activity',
  description: 'Classify an engineering activity.',
  schema: z.object({ qualifies: z.boolean(), confidence: z.number().int().min(0).max(100) }),
});

// These assignments are the actual assertions: if our output shapes drift from
// the real SDK types, `pnpm typecheck` fails. The runtime `it` blocks just keep
// Vitest from treating the file as empty.

const anthropicTool: Anthropic.Messages.Tool = tool.anthropic;
const openaiChatTool: OpenAI.Chat.Completions.ChatCompletionTool = tool.openai;

describe('SDK type compatibility', () => {
  it('Anthropic tool slots into the SDK Tool type', () => {
    expect(anthropicTool.name).toBe('classify_activity');
  });

  it('OpenAI chat tool slots into the SDK ChatCompletionTool type', () => {
    expect(openaiChatTool.type).toBe('function');
  });
});
