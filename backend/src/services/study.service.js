const Flashcard = require("../models/Flashcard");
const Quiz = require("../models/Quiz");
const { getNoteById } = require("./note.service");

const listFlashcards = async (userId, noteId) => {
  await getNoteById(userId, noteId); // 400 or 404 if the note is not yours
  return Flashcard.find({ note: noteId, user: userId })
    .sort({ _id: 1 })
    .limit(200);
};

const clearFlashcards = async (userId, noteId) => {
  await getNoteById(userId, noteId);
  await Flashcard.deleteMany({ note: noteId, user: userId });
};

const listQuizzes = async (userId, noteId) => {
  await getNoteById(userId, noteId);
  return Quiz.find({ note: noteId, user: userId })
    .sort({ createdAt: -1 })
    .limit(10);
};

module.exports = { listFlashcards, clearFlashcards, listQuizzes };
