const { z } = require('zod');

const createGroupSchema = z.object({
  name: z.string().min(3).max(50),
  projectTitle: z.string().max(100).optional(),
  deadline: z.string().datetime().optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(1000),
  channel: z.enum(['general', 'resources', 'help', 'announcements']).default('general'),
});

module.exports = { createGroupSchema, sendMessageSchema };