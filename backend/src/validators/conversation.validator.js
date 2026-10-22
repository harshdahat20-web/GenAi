const { z } = require("zod");

const mode = z.enum(["chat", "math"]);

const createSchema = z.object({
  body: z.object({
    mode: mode.default("chat"),
    title: z.string().trim().min(1).max(80).optional(),
  }),
});

const updateSchema = z.object({
  body: z
    .object({ title: z.string().trim().min(1).max(80), mode })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide a title or a mode to update",
    }),
});

const messageSchema = z.object({
  body: z.object({
    message: z.string().trim().min(1, "Message is required").max(4000),
  }),
});

module.exports = { createSchema, updateSchema, messageSchema };
