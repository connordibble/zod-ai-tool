import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('examples smoke tests', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('imports provider builder examples', async () => {
    await expect(import('../examples/anthropic-basic.js')).resolves.toBeDefined();
    await expect(import('../examples/openai-basic.js')).resolves.toBeDefined();
    await expect(import('../examples/gemini-basic.js')).resolves.toBeDefined();
  });

  it('runs the define pattern example with a mocked client', async () => {
    const { classificationTool, run } = await import('../examples/define-pattern.js');
    const parsed = await run('Classify this activity.', {
      messages: {
        create: async () => ({
          content: [
            {
              type: 'tool_use',
              input: {
                qualifies: true,
                confidence: 90,
                narrative: 'The work attempted to resolve technical uncertainty.',
                category: 'research',
                disqualifiers: [],
              },
            },
          ],
        }),
      },
    });

    expect(classificationTool.gemini.name).toBe('classify_activity');
    expect(parsed.qualifies).toBe(true);
    expect(parsed.confidence).toBe(90);
  });
});
