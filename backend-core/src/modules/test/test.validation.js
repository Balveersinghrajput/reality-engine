const { z } = require('zod');

const submitTestSchema = z.object({
  taskId: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.string(),
  })),
  timeTaken: z.number().int().min(1),
});

module.exports = { submitTestSchema };