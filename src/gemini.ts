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
 *
 * The schema is emitted as `parametersJsonSchema` (standard JSON Schema) rather
 * than the legacy `parameters` field, whose restricted OpenAPI subset rejects
 * keywords produced by common Zod types such as literals, records, and tuples.
 */
export function toGeminiFunctionDeclaration<TSchema extends ZodObjectSchema>(
  config: AIToolConfig<TSchema>,
): GeminiFunctionDeclaration {
  return {
    name: config.name,
    description: config.description,
    parametersJsonSchema: zodObjectToJsonSchema(config.schema, config.diagnostics),
  };
}
