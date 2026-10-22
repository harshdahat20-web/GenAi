const { z } = require("zod");

const improveSchema = z.object({
  body: z.object({
    bullets: z.array(z.string().trim().min(1).max(300)).min(1).max(8),
    role: z.string().trim().max(80).optional(),
    company: z.string().trim().max(80).optional(),
  }),
});

const summarySchema = z.object({
  body: z.object({
    targetRole: z.string().trim().max(80).optional(),
  }),
});

const matchSchema = z.object({
  body: z.object({
    jobDescription: z
      .string()
      .trim()
      .min(50, "Paste the full job description (at least 50 characters)")
      .max(6000, "Job description is too long (max 6000 characters)"),
  }),
});

module.exports = { improveSchema, summarySchema, matchSchema };
