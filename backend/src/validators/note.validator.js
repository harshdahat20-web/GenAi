const { z } = require("zod");

const createNoteSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(120),
    content: z.string().min(1).max(20000),
    tags: z.array(z.string().max(30)).max(10).optional(),
  }),
});

const updateNoteSchema = z.object({
  body: z
    .object({
      title: z.string().min(1).max(120),
      content: z.string().min(1).max(20000),
      tags: z.array(z.string().max(30)).max(10),
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide at least one field to update",
    }),
});

module.exports = { createNoteSchema, updateNoteSchema };
