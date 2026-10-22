const mongoose = require("mongoose");
const Note = require("../models/Note");
const ApiError = require("../utils/ApiError");
const Flashcard = require("../models/Flashcard");
const Quiz = require("../models/Quiz");

const assertValidId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid note id");
};

// Escape special characters so user input is searched as plain text, never as a regex pattern
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeTags = (tags) => [
  ...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean)),
];
const prepare = (data) =>
  data.tags ? { ...data, tags: normalizeTags(data.tags) } : data;

const createNote = (userId, data) =>
  Note.create({ ...prepare(data), user: userId });

const getNotes = async (
  userId,
  { page = 1, limit = 10, search = "", tag = "" },
) => {
  const filter = { user: userId };
  if (tag) filter.tags = tag.toLowerCase();
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ title: rx }, { content: rx }, { tags: rx }];
  }

  const skip = (page - 1) * limit;
  const [notes, total] = await Promise.all([
    Note.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Note.countDocuments(filter),
  ]);
  return { notes, total, page, pages: Math.ceil(total / limit) };
};

const getTags = (userId) =>
  Note.aggregate([
    { $match: { user: userId } },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 50 },
    { $project: { _id: 0, tag: "$_id", count: 1 } },
  ]);

const getNoteById = async (userId, noteId) => {
  assertValidId(noteId);
  const note = await Note.findOne({ _id: noteId, user: userId });
  if (!note) throw new ApiError(404, "Note not found");
  return note;
};

const updateNote = async (userId, noteId, data) => {
  assertValidId(noteId);
  const note = await Note.findOneAndUpdate(
    { _id: noteId, user: userId },
    prepare(data),
    {
      new: true,
      runValidators: true,
    },
  );
  if (!note) throw new ApiError(404, "Note not found");
  return note;
};

const deleteNote = async (userId, noteId) => {
  assertValidId(noteId);
  const note = await Note.findOneAndDelete({ _id: noteId, user: userId });
  if (!note) throw new ApiError(404, "Note not found");

  // Remove the note's study material too, otherwise it stays in the database forever
  await Promise.all([
    Flashcard.deleteMany({ note: noteId, user: userId }),
    Quiz.deleteMany({ note: noteId, user: userId }),
  ]);
};

module.exports = {
  createNote,
  getNotes,
  getTags,
  getNoteById,
  updateNote,
  deleteNote,
};
