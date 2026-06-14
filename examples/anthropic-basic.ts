import { z } from 'zod';
import { toAnthropicTool } from 'zod-ai-tool';

const ClassificationSchema = z.object({
  qualifies: z.boolean(),
  confidence: z.number().int().min(0).max(100),
  narrative: z.string().max(500),
  category: z.enum(['research', 'development', 'other']),
  disqualifiers: z.array(z.string()).max(5),
});

const tool = toAnthropicTool({
  name: 'classify_activity',
  description: 'Classify an engineering activity against IRS R&D criteria.',
  schema: ClassificationSchema,
});

// `tool` is ready to pass directly to the Anthropic SDK:
//
//   const anthropic = new Anthropic();
//   const response = await anthropic.messages.create({
//     model: 'claude-sonnet-4-6',
//     max_tokens: 1024,
//     tools: [tool],
//     messages: [{ role: 'user', content: prompt }],
//   });
console.log(JSON.stringify(tool, null, 2));
