import { z } from 'zod';
import { toGeminiFunctionDeclaration } from 'zod-ai-tool';

const ClassificationSchema = z.object({
  qualifies: z.boolean(),
  confidence: z.number().int().min(0).max(100),
  category: z.enum(['research', 'development', 'other']),
});

const declaration = toGeminiFunctionDeclaration({
  name: 'classify_activity',
  description: 'Classify an engineering activity against IRS R&D criteria.',
  schema: ClassificationSchema,
});

// `declaration` is ready to place inside a Gemini tool:
//
//   const response = await ai.models.generateContent({
//     model: 'gemini-3.5-flash',
//     contents: prompt,
//     config: {
//       tools: [{ functionDeclarations: [declaration] }],
//     },
//   });
console.log(JSON.stringify(declaration, null, 2));
