import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { zodObjectToJsonSchema } from '../src/convert.js';

describe('unsupported Zod constructs', () => {
  it('warns but still returns a best-effort schema for a transform', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const schema = zodObjectToJsonSchema(
      z.object({ a: z.string().transform((s) => s.length) }),
      'warn',
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(schema.type).toBe('object');
    expect(schema.properties).toHaveProperty('a');
    warn.mockRestore();
  });

  it('does not throw by default for preprocess', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const schema = zodObjectToJsonSchema(
      z.object({ n: z.preprocess((v) => Number(v), z.number()) }),
    );
    expect(schema.type).toBe('object');
    warn.mockRestore();
  });

  it('stays silent when diagnostics is "silent"', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    zodObjectToJsonSchema(z.object({ a: z.string().transform((s) => s.length) }), 'silent');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
