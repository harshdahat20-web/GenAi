const Note = require("../../models/Note");
const ApiError = require("../../utils/ApiError");
const { generateText } = require("./llm.client");
const { logUsage } = require("../usage.service");
const prompt = require("./prompts/chat.prompt");

const chatWithNote = async (userId, noteId, message, history = []) => {
  const note = await Note.findOne({ _id: noteId, user: userId });
  if (!note) throw new ApiError(404, "Note not found");

  const recent = history.slice(-6); // only the last 6 messages, keeps cost down

  const { text, usage } = await generateText({
    system: prompt.system,
    prompt: prompt.buildPrompt(note.title, note.content, recent, message),
    maxTokens: 800,
  });

  await logUsage(userId, "chat", usage);
  return { reply: text.trim() };
};

module.exports = { chatWithNote };
