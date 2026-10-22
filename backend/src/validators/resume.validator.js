const { z } = require("zod");

const str = (max) => z.string().trim().max(max);
const bullets = z.array(str(300)).max(8);

const experience = z.object({
  company: str(80),
  role: str(80),
  location: str(80).optional(),
  start: str(20).optional(),
  end: str(20).optional(),
  current: z.boolean().optional(),
  bullets: bullets.optional(),
});

const education = z.object({
  school: str(100),
  degree: str(100),
  location: str(80).optional(),
  start: str(20).optional(),
  end: str(20).optional(),
  details: str(300).optional(),
});

const project = z.object({
  name: str(80),
  link: str(200).optional(),
  description: str(300).optional(),
  bullets: bullets.optional(),
});

const personal = z
  .object({
    name: str(80),
    email: z
      .string()
      .trim()
      .email("Enter a valid email")
      .max(120)
      .or(z.literal("")),
    phone: str(30),
    location: str(80),
    links: z.array(str(200)).max(5),
    summary: str(600),
  })
  .partial();

const fields = {
  title: str(80).min(1),
  template: z.enum(["classic", "modern"]),
  personal,
  experience: z.array(experience).max(10),
  education: z.array(education).max(6),
  projects: z.array(project).max(10),
  skills: z.array(str(40)).max(40),
};

// creating: every field is optional (a blank resume is fine)
const createSchema = z.object({ body: z.object(fields).partial() });

// updating: send only what changed, but send something
const updateSchema = z.object({
  body: z
    .object(fields)
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide at least one field to update",
    }),
});

module.exports = { createSchema, updateSchema };
