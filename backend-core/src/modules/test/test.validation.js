const { z } = require('zod');

const submitTestSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),

  answers: z.array(
    z.object({
      questionId: z.string(),
      answer:     z.union([z.string(), z.number()]).transform(v => String(v)),
    }),
  ).min(1, 'At least one answer is required'),

  timeTaken: z.number().int().min(0).max(86400).default(0),
});

module.exports = { submitTestSchema };