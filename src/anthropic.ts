import { zodObjectToJsonSchema } from './convert.js';
import type { AIToolConfig, AnthropicTool, ZodObjectSchema } from './types.js';

/**
 * Build an Anthropic tool definition from a Zod object schema.
 *
 * The returned object is structurally compatible with the `Tool` type from
 * `@anthropic-ai/sdk` and can be passed directly to
 * `anthropic.messages.create({ tools: [tool] })`.
 */
export function toAnthropicTool<TSchema extends ZodObjectSchema>(
  config: AIToolConfig<TSchema>,
): AnthropicTool {
  return {
    name: config.name,
    description: config.description,
    input_schema: zodObjectToJsonSchema(config.schema, config.diagnostics),
  };
}
