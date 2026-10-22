const asyncHandler = require("../utils/asyncHandler");
const noteService = require("../services/note.service");

const clean = (v) => (typeof v === "string" ? v.trim().slice(0, 100) : "");

const createNote = asyncHandler(async (req, res) => {
  const note = await noteService.createNote(req.user._id, req.body);
  res.status(201).json({ success: true, note });
});

const getNotes = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
  const data = await noteService.getNotes(req.user._id, {
    page,
    limit,
    search: clean(req.query.q),
    tag: clean(req.query.tag),
  });
  res.json({ success: true, ...data });
});

const getTags = asyncHandler(async (req, res) => {
  const tags = await noteService.getTags(req.user._id);
  res.json({ success: true, tags });
});

const getNote = asyncHandler(async (req, res) => {
  const note = await noteService.getNoteById(req.user._id, req.params.id);
  res.json({ success: true, note });
});

const updateNote = asyncHandler(async (req, res) => {
  const note = await noteService.updateNote(
    req.user._id,
    req.params.id,
    req.body,
  );
  res.json({ success: true, note });
});

const deleteNote = asyncHandler(async (req, res) => {
  await noteService.deleteNote(req.user._id, req.params.id);
  res.status(204).send();
});

module.exports = {
  createNote,
  getNotes,
  getTags,
  getNote,
  updateNote,
  deleteNote,
};
