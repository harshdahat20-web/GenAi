const Note = require("../../models/Note");
const ApiError = require("../../utils/ApiError");
const { generateText } = require("./llm.client");
const prompt = require("./prompts/summarize.prompt");
const { logUsage } = require("../usage.service");

const summarizeNote = async (userId, noteId) => {
  const note = await Note.findOne({ _id: noteId, user: userId });
  if (!note) throw new ApiError(404, "Note not found");

  const { text, usage } = await generateText({
    system: prompt.system,
    prompt: prompt.buildPrompt(note.title, note.content),
    maxTokens: 600,
  });
  await logUsage(userId, "summarize", usage);
  note.summary = text.trim();
  await note.save();

  return { note, usage };
};

module.exports = { summarizeNote };
