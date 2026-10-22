const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/conversation.service");

const list = asyncHandler(async (req, res) => {
  const chats = await service.list(req.user._id);
  res.json({ success: true, chats });
});

const create = asyncHandler(async (req, res) => {
  const chat = await service.create(req.user._id, req.body);
  res.status(201).json({ success: true, chat });
});

const get = asyncHandler(async (req, res) => {
  const chat = await service.get(req.user._id, req.params.id);
  res.json({ success: true, chat });
});

const update = asyncHandler(async (req, res) => {
  const chat = await service.update(req.user._id, req.params.id, req.body);
  res.json({ success: true, chat });
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.user._id, req.params.id);
  res.status(204).send();
});

const sendMessage = asyncHandler(async (req, res) => {
  const { messages, title } = await service.sendMessage(
    req.user._id,
    req.params.id,
    req.body.message,
  );
  res.status(201).json({ success: true, messages, title });
});

module.exports = { list, create, get, update, remove, sendMessage };
