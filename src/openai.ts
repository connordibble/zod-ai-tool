import { zodObjectToJsonSchema } from './convert.js';
import { toOpenAIStrictJsonSchema } from './openai-strict.js';
import type {
  AIToolConfig,
  OpenAIChatTool,
  OpenAIResponsesTool,
  ZodObjectSchema,
} from './types.js';

/**
 * Build an OpenAI Chat Completions tool from a Zod object schema.
 *
 * The returned object is structurally compatible with `ChatCompletionTool` from
 * the `openai` package and can be passed to
 * `openai.chat.completions.create({ tools: [tool] })`.
 */
export function toOpenAIFunction<TSchema extends ZodObjectSchema>(
  config: AIToolConfig<TSchema>,
): OpenAIChatTool {
  const parameters = zodObjectToJsonSchema(config.schema, config.diagnostics);

  return {
    type: 'function',
    function: {
      name: config.name,
      description: config.description,
      parameters: config.strict ? toOpenAIStrictJsonSchema(parameters) : parameters,
      ...(config.strict ? { strict: true } : {}),
    },
  };
}

/**
 * Build an OpenAI Responses API tool from a Zod object schema.
 *
 * The Responses API uses a flat function-tool shape (no nested `function`
 * object). This builder explicitly opts out of strict mode so loose schemas
 * remain valid. Pass it to `openai.responses.create({ tools: [tool] })`.
 */
export function toOpenAIResponsesTool<TSchema extends ZodObjectSchema>(
  config: AIToolConfig<TSchema>,
): OpenAIResponsesTool {
  const parameters = zodObjectToJsonSchema(config.schema, config.diagnostics);

  return {
    type: 'function',
    name: config.name,
    description: config.description,
    parameters: config.strict ? toOpenAIStrictJsonSchema(parameters) : parameters,
    strict: config.strict === true,
  };
}
