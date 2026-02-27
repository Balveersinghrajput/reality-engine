const { z } = require('zod');

const createTaskSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10),
  topic: z.string().min(2),
  dayNumber: z.number().int().min(1),
  stepNumber: z.number().int().min(1),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedMinutes: z.number().int().min(5),
  hasCodeChallenge: z.boolean().default(false),
  starterCode: z.string().optional(),
  allowedLanguages: z.array(z.string()).default([]),
});

const reflectionSchema = z.object({
  completed: z.boolean(),
  hoursStudied: z.number().min(0).max(24),
  understandingPct: z.number().int().min(0).max(100),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  notes: z.string().max(500).optional(),
});

module.exports = { createTaskSchema, reflectionSchema };