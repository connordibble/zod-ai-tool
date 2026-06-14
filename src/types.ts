import type { z } from 'zod';

/**
 * Controls what happens when a schema contains constructs that do not survive a
 * clean round-trip to JSON Schema (`.transform()`, `.pipe()`, `.preprocess()`,
 * `.refine()`, and similar).
 *
 * - `'silent'` — do nothing.
 * - `'warn'` — emit a single `console.warn` (default).
 * - `'throw'` — throw an `Error`.
 */
export type Diagnostics = 'silent' | 'warn' | 'throw';

/**
 * A Zod object schema. This is the only supported root shape for AI tool
 * inputs — both Anthropic and OpenAI require object-shaped tool parameters.
 */
// `z.ZodObject` has different generic arity across Zod 3 and Zod 4, so we keep
// this loose and rely on the call-site `TSchema extends ZodObjectSchema` bound.
export type ZodObjectSchema = z.ZodType<Record<string, unknown>>;

/**
 * Input accepted by every builder in this package.
 */
export interface AIToolConfig<TSchema extends ZodObjectSchema> {
  /** Tool name passed through verbatim to the provider. */
  name: string;
  /** Human/model-facing description of what the tool does. */
  description: string;
  /** The single source of truth: a root Zod object schema. */
  schema: TSchema;
  /**
   * How to report unsupported Zod constructs found while converting.
   * @default 'warn'
   */
  diagnostics?: Diagnostics;
}

/**
 * A JSON Schema object describing tool input. Always `type: "object"` at the
 * root with a guaranteed `required` array.
 */
export interface JsonSchemaObject {
  type: 'object';
  properties?: Record<string, unknown>;
  required: string[];
  [key: string]: unknown;
}

/**
 * Structurally compatible with `Tool` from `@anthropic-ai/sdk`. Defined locally
 * so this package has no runtime dependency on the Anthropic SDK; the shape is
 * assignable to the SDK type without casting (verified by the type-compat tests).
 */
export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: JsonSchemaObject;
}

/**
 * Structurally compatible with `ChatCompletionTool` from `openai` (Chat
 * Completions API).
 */
export interface OpenAIChatTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: JsonSchemaObject;
  };
}

/**
 * Structurally compatible with the flat function tool shape used by the OpenAI
 * Responses API.
 */
export interface OpenAIResponsesTool {
  type: 'function';
  name: string;
  description: string;
  parameters: JsonSchemaObject;
  strict: false;
}
