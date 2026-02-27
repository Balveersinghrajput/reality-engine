const { z } = require('zod');

const updateProfileSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/).optional(),
  profilePic: z.string().url().optional(),
  mode: z.enum(['normal', 'competitive', 'harsh']).optional(),
});

const searchSchema = z.object({
  query: z.string().min(1).max(50),
});

module.exports = { updateProfileSchema, searchSchema };