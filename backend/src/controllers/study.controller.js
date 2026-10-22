const asyncHandler = require("../utils/asyncHandler");
const studyService = require("../services/study.service");

const listFlashcards = asyncHandler(async (req, res) => {
  const cards = await studyService.listFlashcards(req.user._id, req.params.id);
  res.json({ success: true, cards });
});

const clearFlashcards = asyncHandler(async (req, res) => {
  await studyService.clearFlashcards(req.user._id, req.params.id);
  res.status(204).send();
});

const listQuizzes = asyncHandler(async (req, res) => {
  const quizzes = await studyService.listQuizzes(req.user._id, req.params.id);
  res.json({ success: true, quizzes });
});

module.exports = { listFlashcards, clearFlashcards, listQuizzes };
