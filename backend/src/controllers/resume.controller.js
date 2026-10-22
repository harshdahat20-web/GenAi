const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/resume.service");

const list = asyncHandler(async (req, res) => {
  const resumes = await service.list(req.user._id);
  res.json({ success: true, resumes });
});

const create = asyncHandler(async (req, res) => {
  const resume = await service.create(req.user._id, req.body);
  res.status(201).json({ success: true, resume });
});

const get = asyncHandler(async (req, res) => {
  const resume = await service.get(req.user._id, req.params.id);
  res.json({ success: true, resume });
});

const update = asyncHandler(async (req, res) => {
  const resume = await service.update(req.user._id, req.params.id, req.body);
  res.json({ success: true, resume });
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.user._id, req.params.id);
  res.status(204).send();
});

const duplicate = asyncHandler(async (req, res) => {
  const resume = await service.duplicate(req.user._id, req.params.id);
  res.status(201).json({ success: true, resume });
});

module.exports = { list, create, get, update, remove, duplicate };
