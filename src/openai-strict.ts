import type { JsonSchemaObject } from './types.js';

const STRICT_OPTIONAL_MESSAGE =
  'zod-ai-tool: OpenAI strict mode requires optional fields to accept null. ' +
  'Use .nullable().optional() or .nullish() for optional fields before enabling strict mode. ' +
  '(.default() also makes a field optional in the input schema.)';

const STRICT_OPEN_OBJECT_MESSAGE =
  'zod-ai-tool: OpenAI strict mode requires additionalProperties: false on every object, so ' +
  'open objects (z.record(...), .catchall(...), .passthrough()) cannot be represented. ' +
  'Replace the open object with explicit properties or disable strict mode.';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneJsonSchemaValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(cloneJsonSchemaValue);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneJsonSchemaValue(entry)]),
    );
  }
  return value;
}

function schemaAllowsNull(schema: unknown): boolean {
  if (!isPlainObject(schema)) {
    return false;
  }

  const type = schema.type;
  if (type === 'null' || (Array.isArray(type) && type.includes('null'))) {
    return true;
  }
  if (schema.const === null) {
    return true;
  }
  if (Array.isArray(schema.enum) && schema.enum.includes(null)) {
    return true;
  }

  for (const keyword of ['anyOf', 'oneOf'] as const) {
    const options = schema[keyword];
    if (Array.isArray(options) && options.some(schemaAllowsNull)) {
      return true;
    }
  }

  return false;
}

function isObjectSchema(schema: Record<string, unknown>): boolean {
  const type = schema.type;
  return (
    type === 'object' ||
    (Array.isArray(type) && type.includes('object')) ||
    isPlainObject(schema.properties)
  );
}

function strictifySchemaNode(schema: unknown, path: string): unknown {
  if (Array.isArray(schema)) {
    return schema.map((item, index) => strictifySchemaNode(item, `${path}[${index}]`));
  }
  if (!isPlainObject(schema)) {
    return schema;
  }

  const out = Object.fromEntries(
    Object.entries(schema).map(([key, value]) => [key, strictifySchemaNode(value, `${path}.${key}`)]),
  );

  if (!isObjectSchema(out)) {
    return out;
  }

  // An `additionalProperties` schema (or `true`) means the object accepts keys
  // beyond `properties`. Strict mode forces `additionalProperties: false`, which
  // would silently forbid every key of a record — throw instead of corrupting.
  if ('additionalProperties' in out && out.additionalProperties !== false) {
    throw new Error(`${STRICT_OPEN_OBJECT_MESSAGE} Offending object: ${path}.`);
  }

  const properties = isPlainObject(out.properties) ? out.properties : {};
  const propertyNames = Object.keys(properties);
  const required = Array.isArray(schema.required) ? new Set(schema.required) : new Set<unknown>();

  for (const name of propertyNames) {
    if (!required.has(name) && !schemaAllowsNull(properties[name])) {
      throw new Error(`${STRICT_OPTIONAL_MESSAGE} Offending field: ${path}.${name}.`);
    }
  }

  out.properties = properties;
  out.required = propertyNames;
  out.additionalProperties = false;

  return out;
}

/**
 * Rewrite a provider JSON Schema into the subset OpenAI strict mode accepts.
 *
 * OpenAI strict mode requires every object to opt out of arbitrary properties
 * and list every declared property in `required`. A field that was optional in
 * Zod must already allow `null`, otherwise OpenAI could return a value that the
 * original Zod schema rejects.
 */
export function toOpenAIStrictJsonSchema(schema: JsonSchemaObject): JsonSchemaObject {
  return strictifySchemaNode(cloneJsonSchemaValue(schema), 'parameters') as JsonSchemaObject;
}
