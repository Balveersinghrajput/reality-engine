const { z } = require('zod');

// ─────────────────────────────────────────────────────────────────
// submitTest body validation
// ─────────────────────────────────────────────────────────────────
const submitTestSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),

  answers: z
    .array(
      z.object({
        questionId: z.union([z.string(), z.number()]).transform(v => String(v)),
        answer:     z.union([z.string(), z.number()]).transform(v => String(v)),
      }),
    )
    .min(1, 'At least one answer is required'),

  questions: z
    .array(
      z.object({
        id:          z.union([z.string(), z.number()]),
        type:        z.enum(['mcq', 'short', 'code', 'truefalse']),
        question:    z.string(),
        correct:     z.string(),
        explanation: z.string().optional().default(''),
        points:      z.number().int().min(1).default(10),
        options:     z.array(z.string()).optional(),
        code:        z.string().optional(),
      }),
    )
    .min(1, 'questions array is required'),

  timeTaken: z.number().int().min(0).max(86400).default(0),
});

// ─────────────────────────────────────────────────────────────────
// generateTest params validation
// ─────────────────────────────────────────────────────────────────
const generateTestParamsSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
});

module.exports = { submitTestSchema, generateTestParamsSchema };