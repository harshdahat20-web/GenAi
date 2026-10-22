const { z } = require("zod");
const Note = require("../../models/Note");
const Quiz = require("../../models/Quiz");
const ApiError = require("../../utils/ApiError");
const parseJson = require("../../utils/parseJson");
const { generateText } = require("./llm.client");
const prompt = require("./prompts/quiz.prompt");
const { logUsage } = require("../usage.service");

const outputSchema = z
  .array(
    z.object({
      question: z.string().min(1),
      options: z.array(z.string().min(1)).length(4),
      correctIndex: z.number().int().min(0).max(3),
      explanation: z.string().optional().default(""),
    }),
  )
  .min(1);

const generateQuiz = async (userId, noteId, count = 5) => {
  const note = await Note.findOne({ _id: noteId, user: userId });
  if (!note) throw new ApiError(404, "Note not found");

  const { text, usage } = await generateText({
    system: prompt.system,
    prompt: prompt.buildPrompt(note.title, note.content, count),
    maxTokens: 2000,
  });

  await logUsage(userId, "quiz", usage);

  const parsed = outputSchema.safeParse(parseJson(text));
  if (!parsed.success)
    throw new ApiError(502, "AI returned an invalid response");

  const quiz = await Quiz.create({
    user: userId,
    note: noteId,
    questions: parsed.data,
  });
  return { quiz, usage };
};

module.exports = { generateQuiz };
