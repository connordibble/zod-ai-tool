import { z } from 'zod';

/** True when the installed Zod ships the built-in `z.toJSONSchema` (Zod 4+). */
export const isZod4 =
  typeof (z as unknown as { toJSONSchema?: unknown }).toJSONSchema === 'function';
