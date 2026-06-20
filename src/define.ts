import type { z } from 'zod';

import { toAnthropicTool } from './anthropic.js';
import { toGeminiFunctionDeclaration } from './gemini.js';
import { toOpenAIFunction, toOpenAIResponsesTool } from './openai.js';
import type {
  AIToolConfig,
  AnthropicTool,
  GeminiFunctionDeclaration,
  OpenAIChatTool,
  OpenAIResponsesTool,
  ZodObjectSchema,
} from './types.js';

/**
 * The coupled tool definition + validator returned by {@link defineAITool}.
 *
 * It is a plain object — no class, no hidden behavior. The provider tool
 * definitions and the runtime validator are all derived from the same `schema`,
 * so they cannot drift.
 */
export interface AITool<TSchema extends ZodObjectSchema> {
  /** Anthropic tool definition (Messages API). */
  anthropic: AnthropicTool;
  /** OpenAI tool definition (Chat Completions API). */
  openai: OpenAIChatTool;
  /** OpenAI tool definition (Responses API, flat shape). */
  openaiResponses: OpenAIResponsesTool;
  /** Google Gemini function declaration. */
  gemini: GeminiFunctionDeclaration;
  /** Parse and validate model output. Throws `ZodError` on invalid input. */
  validate: (input: unknown) => z.infer<TSchema>;
  /** Non-throwing parse. Returns the Zod `SafeParseReturn` for the installed version. */
  safeParse: (input: unknown) => ReturnType<TSchema['safeParse']>;
  /** The original Zod schema, for any other use. */
  schema: TSchema;
}

/**
 * Define an AI tool from a single Zod object schema.
 *
 * Returns provider-ready tool definitions plus a validator, all derived from the
 * same schema. Use the tool definition in the API call and `validate`/`safeParse`
 * on the model's tool output — same source, guaranteed alignment.
 */
export function defineAITool<TSchema extends ZodObjectSchema>(
  config: AIToolConfig<TSchema>,
): AITool<TSchema> {
  const { schema } = config;

  return {
    anthropic: toAnthropicTool(config),
    openai: toOpenAIFunction(config),
    openaiResponses: toOpenAIResponsesTool(config),
    gemini: toGeminiFunctionDeclaration(config),
    validate: (input: unknown) => schema.parse(input) as z.infer<TSchema>,
    safeParse: (input: unknown) =>
      schema.safeParse(input) as ReturnType<TSchema['safeParse']>,
    schema,
  };
}
