const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const summarizeService = require("../services/ai/summarize.service");
const flashcardService = require("../services/ai/flashcard.service");
const quizService = require("../services/ai/quiz.service");
const chatService = require("../services/ai/chat.service");

const summarize = asyncHandler(async (req, res) => {
  const { noteId } = req.params;
  if (!mongoose.isValidObjectId(noteId))
    throw new ApiError(400, "Invalid note id");

  const { note } = await summarizeService.summarizeNote(req.user._id, noteId);
  res.json({ success: true, note });
});

const getCount = (value, fallback, max) =>
  Math.min(Math.max(parseInt(value) || fallback, 1), max);

const generateFlashcards = asyncHandler(async (req, res) => {
  const { noteId } = req.params;
  if (!mongoose.isValidObjectId(noteId))
    throw new ApiError(400, "Invalid note id");

  const count = getCount(req.body.count, 8, 15);
  const { cards } = await flashcardService.generateFlashcards(
    req.user._id,
    noteId,
    count,
  );
  res.status(201).json({ success: true, cards });
});

const generateQuiz = asyncHandler(async (req, res) => {
  const { noteId } = req.params;
  if (!mongoose.isValidObjectId(noteId))
    throw new ApiError(400, "Invalid note id");

  const count = getCount(req.body.count, 5, 10);
  const { quiz } = await quizService.generateQuiz(req.user._id, noteId, count);
  res.status(201).json({ success: true, quiz });
});

const usageService = require("../services/usage.service");

const getUsage = asyncHandler(async (req, res) => {
  const usage = await usageService.getUserUsage(req.user._id);
  res.json({ success: true, usage });
});

const chat = asyncHandler(async (req, res) => {
  const { noteId } = req.params;
  if (!mongoose.isValidObjectId(noteId))
    throw new ApiError(400, "Invalid note id");

  const { message, history } = req.body;
  const { reply } = await chatService.chatWithNote(
    req.user._id,
    noteId,
    message,
    history,
  );
  res.json({ success: true, reply });
});

module.exports = {
  summarize,
  generateFlashcards,
  generateQuiz,
  getUsage,
  chat,
};
