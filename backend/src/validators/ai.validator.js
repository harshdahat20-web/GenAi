const { z } = require("zod");

const chatSchema = z.object({
  body: z.object({
    message: z.string().trim().min(1, "Message is required").max(1000),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          text: z.string().max(2000),
        }),
      )
      .max(10)
      .optional()
      .default([]),
  }),
});

module.exports = { chatSchema };
