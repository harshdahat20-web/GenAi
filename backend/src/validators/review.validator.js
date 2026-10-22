const { z } = require("zod");

const FOCUS = ["bugs", "security", "performance", "readability", "tests"];

const reviewSchema = z.object({
  body: z.object({
    code: z
      .string()
      .max(8000, "Code is too long (max 8000 characters)")
      .refine((s) => s.trim().length >= 5, "Please paste some code")
      .refine(
        (s) => s.split("\n").length <= 400,
        "Code is too long (max 400 lines)",
      ),
    language: z.string().trim().max(30).optional(),
    focus: z.array(z.enum(FOCUS)).max(5).optional(),
  }),
});

module.exports = { reviewSchema };
