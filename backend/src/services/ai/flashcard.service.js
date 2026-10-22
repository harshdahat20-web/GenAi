const { z } = require("zod");
const Note = require("../../models/Note");
const Flashcard = require("../../models/Flashcard");
const ApiError = require("../../utils/ApiError");
const parseJson = require("../../utils/parseJson");
const { generateText } = require("./llm.client");
const prompt = require("./prompts/flashcard.prompt");
const { logUsage } = require("../usage.service");

const outputSchema = z
  .array(z.object({ question: z.string().min(1), answer: z.string().min(1) }))
  .min(1);

const generateFlashcards = async (userId, noteId, count = 8) => {
  const note = await Note.findOne({ _id: noteId, user: userId });
  if (!note) throw new ApiError(404, "Note not found");

  const { text, usage } = await generateText({
    system: prompt.system,
    prompt: prompt.buildPrompt(note.title, note.content, count),
    maxTokens: 1500,
  });
  await logUsage(userId, "flashcards", usage);
  const parsed = outputSchema.safeParse(parseJson(text));
  if (!parsed.success)
    throw new ApiError(502, "AI returned an invalid response");

  const cards = await Flashcard.insertMany(
    parsed.data.map((c) => ({ ...c, user: userId, note: noteId })),
  );

  return { cards, usage };
};

module.exports = { generateFlashcards };
