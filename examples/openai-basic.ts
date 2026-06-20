import { z } from 'zod';
import { toOpenAIFunction, toOpenAIResponsesTool } from 'zod-ai-tool';

const ClassificationSchema = z.object({
  qualifies: z.boolean(),
  confidence: z.number().int().min(0).max(100),
  category: z.enum(['research', 'development', 'other']),
  reviewer_note: z.string().nullable().optional(),
});

// Chat Completions API (nested `function` shape):
const chatTool = toOpenAIFunction({
  name: 'classify_activity',
  description: 'Classify an engineering activity against IRS R&D criteria.',
  schema: ClassificationSchema,
});

//   const openai = new OpenAI();
//   await openai.chat.completions.create({ model: 'gpt-4o', tools: [chatTool], messages });

// Responses API (flat shape):
const responsesTool = toOpenAIResponsesTool({
  name: 'classify_activity',
  description: 'Classify an engineering activity against IRS R&D criteria.',
  schema: ClassificationSchema,
});

//   await openai.responses.create({ model: 'gpt-4o', tools: [responsesTool], input });

// Strict mode requires nullable optionals, so `reviewer_note` uses
// `.nullable().optional()`.
const strictResponsesTool = toOpenAIResponsesTool({
  name: 'classify_activity',
  description: 'Classify an engineering activity against IRS R&D criteria.',
  schema: ClassificationSchema,
  strict: true,
});

console.log(JSON.stringify({ chatTool, responsesTool, strictResponsesTool }, null, 2));
