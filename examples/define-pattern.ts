import { z } from 'zod';
import { defineAITool } from 'zod-ai-tool';

const ClassificationSchema = z.object({
  qualifies: z.boolean(),
  confidence: z.number().int().min(0).max(100),
  narrative: z.string().max(500),
  category: z.enum(['research', 'development', 'other']),
  disqualifiers: z.array(z.string()).max(5),
});

// One definition. Tool schema and validator can never drift.
const classificationTool = defineAITool({
  name: 'classify_activity',
  description: 'Classify an engineering activity against IRS R&D criteria.',
  schema: ClassificationSchema,
});

async function run(prompt: string, anthropic: AnthropicLike) {
  // Use the tool definition in the API call.
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    tools: [classificationTool.anthropic],
    messages: [{ role: 'user', content: prompt }],
  });

  // Parse the result with the SAME schema — same source, guaranteed alignment.
  const toolInput = response.content.find((block) => block.type === 'tool_use')?.input;
  const parsed = classificationTool.validate(toolInput); // throws ZodError if malformed

  return parsed; // typed as z.infer<typeof ClassificationSchema>
}

// Minimal structural stand-in for the Anthropic client (kept dependency-free here).
interface AnthropicLike {
  messages: {
    create(args: unknown): Promise<{ content: Array<{ type: string; input?: unknown }> }>;
  };
}

export { classificationTool, run };
