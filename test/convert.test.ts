import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { isZodObject, reportUnsupported, zodObjectToJsonSchema } from '../src/convert.js';

const Schema = z.object({
  qualifies: z.boolean(),
  confidence: z.number().int().min(0).max(100),
  narrative: z.string().min(1).max(500),
  category: z.enum(['research', 'development', 'other']),
  disqualifiers: z.array(z.string()).max(5),
});

describe('zodObjectToJsonSchema', () => {
  it('produces an object schema with the expected properties', () => {
    const schema = zodObjectToJsonSchema(Schema);
    expect(schema.type).toBe('object');
    expect(Object.keys(schema.properties ?? {})).toEqual([
      'qualifies',
      'confidence',
      'narrative',
      'category',
      'disqualifiers',
    ]);
  });

  it('strips the $schema key', () => {
    const schema = zodObjectToJsonSchema(Schema);
    expect(schema).not.toHaveProperty('$schema');
  });

  it('strips top-level additionalProperties', () => {
    const schema = zodObjectToJsonSchema(Schema);
    expect(schema).not.toHaveProperty('additionalProperties');
  });

  it('always includes a required array, complete for required fields', () => {
    const schema = zodObjectToJsonSchema(Schema);
    expect(Array.isArray(schema.required)).toBe(true);
    expect(schema.required).toEqual(
      expect.arrayContaining(['qualifies', 'confidence', 'narrative', 'category', 'disqualifiers']),
    );
  });

  it('includes an empty required array for all-optional schemas', () => {
    const schema = zodObjectToJsonSchema(z.object({ a: z.string().optional(), b: z.number().optional() }));
    expect(schema.required).toEqual([]);
  });

  it('maps enums correctly', () => {
    const schema = zodObjectToJsonSchema(Schema);
    const category = (schema.properties as Record<string, { enum?: unknown }>).category;
    expect(category.enum).toEqual(['research', 'development', 'other']);
  });

  it('preserves number min/max constraints', () => {
    const schema = zodObjectToJsonSchema(Schema);
    const confidence = (schema.properties as Record<string, Record<string, unknown>>).confidence;
    expect(confidence.minimum).toBe(0);
    expect(confidence.maximum).toBe(100);
  });

  it('preserves string min/max constraints', () => {
    const schema = zodObjectToJsonSchema(Schema);
    const narrative = (schema.properties as Record<string, Record<string, unknown>>).narrative;
    expect(narrative.minLength).toBe(1);
    expect(narrative.maxLength).toBe(500);
  });

  it('produces arrays with type "array" and items', () => {
    const schema = zodObjectToJsonSchema(Schema);
    const disqualifiers = (schema.properties as Record<string, Record<string, unknown>>).disqualifiers;
    expect(disqualifiers.type).toBe('array');
    expect(disqualifiers.items).toMatchObject({ type: 'string' });
    expect(disqualifiers.maxItems).toBe(5);
  });

  it('produces nested objects with nested properties', () => {
    const nested = z.object({
      scores: z.object({ permitted_purpose: z.boolean(), uncertainty: z.boolean() }),
    });
    const schema = zodObjectToJsonSchema(nested);
    const scores = (schema.properties as Record<string, { type?: string; properties?: object }>).scores;
    expect(scores.type).toBe('object');
    expect(scores.properties).toMatchObject({
      permitted_purpose: { type: 'boolean' },
      uncertainty: { type: 'boolean' },
    });
  });

  it('throws a clear error for a non-object root schema', () => {
    expect(() => zodObjectToJsonSchema(z.string() as never)).toThrow(/root Zod objects/);
    expect(() => zodObjectToJsonSchema(z.array(z.string()) as never)).toThrow(/root Zod objects/);
  });

  it('matches a stable snapshot', () => {
    expect(zodObjectToJsonSchema(Schema)).toMatchSnapshot();
  });
});

describe('isZodObject', () => {
  it('recognizes object schemas', () => {
    expect(isZodObject(z.object({ a: z.string() }))).toBe(true);
  });

  it('rejects non-object schemas and non-schemas', () => {
    expect(isZodObject(z.string())).toBe(false);
    expect(isZodObject(z.array(z.string()))).toBe(false);
    expect(isZodObject(null)).toBe(false);
    expect(isZodObject({})).toBe(false);
  });
});

describe('reportUnsupported', () => {
  it('warns once for a transform under "warn"', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    reportUnsupported(z.object({ a: z.string().transform((s) => s.length) }), 'warn');
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('throws for a transform under "throw"', () => {
    expect(() => reportUnsupported(z.object({ a: z.string().transform((s) => s.length) }), 'throw')).toThrow();
  });

  it('stays silent under "silent"', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    reportUnsupported(z.object({ a: z.string().transform((s) => s.length) }), 'silent');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not warn for plain schemas', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    reportUnsupported(z.object({ a: z.string() }), 'warn');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('detects refine and pipe constructs', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    reportUnsupported(z.object({ a: z.string().refine((s) => s.length > 0) }), 'warn');
    reportUnsupported(z.object({ a: z.string().pipe(z.string()) }), 'warn');
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('handles shared (re-referenced) schema nodes without re-walking', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const shared = z.object({ x: z.string() });
    reportUnsupported(z.object({ a: shared, b: shared }), 'warn');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('stops descending past the depth guard without throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    let deep: z.ZodTypeAny = z.object({ leaf: z.string() });
    for (let i = 0; i < 16; i += 1) {
      deep = z.object({ n: deep });
    }
    expect(() => reportUnsupported(deep, 'warn')).not.toThrow();
    warn.mockRestore();
  });

  it('detects constructs nested inside array and union members', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    reportUnsupported(z.object({ arr: z.array(z.string().transform((s) => s.length)) }), 'warn');
    reportUnsupported(
      z.object({ u: z.union([z.string(), z.number().transform((n) => String(n))]) }),
      'warn',
    );
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
