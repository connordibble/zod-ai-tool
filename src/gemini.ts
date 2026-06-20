import { zodObjectToJsonSchema } from './convert.js';
import type {
  AIToolConfig,
  GeminiFunctionDeclaration,
  ZodObjectSchema,
} from './types.js';

/**
 * Build a Google Gemini function declaration from a Zod object schema.
 *
 * The returned object can be used inside a Gemini tool's `functionDeclarations`
 * array. This package only creates the declaration; callers bring their own
 * Gemini SDK client and tool configuration.
 */
export function toGeminiFunctionDeclaration<TSchema extends ZodObjectSchema>(
  config: AIToolConfig<TSchema>,
): GeminiFunctionDeclaration {
  return {
    name: config.name,
    description: config.description,
    parameters: zodObjectToJsonSchema(config.schema, config.diagnostics),
  };
}
