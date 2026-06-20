import { describe, expect, it } from 'vitest';

import * as api from '../src/index.js';

describe('public API surface', () => {
  it('exports the documented functions', () => {
    expect(typeof api.defineAITool).toBe('function');
    expect(typeof api.toAnthropicTool).toBe('function');
    expect(typeof api.toGeminiFunctionDeclaration).toBe('function');
    expect(typeof api.toOpenAIFunction).toBe('function');
    expect(typeof api.toOpenAIResponsesTool).toBe('function');
  });
});
