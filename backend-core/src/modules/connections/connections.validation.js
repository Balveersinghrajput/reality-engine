const { z } = require('zod');

const messageSchema = z.object({
  content: z.string().min(1).max(1000),
});

module.exports = { messageSchema };