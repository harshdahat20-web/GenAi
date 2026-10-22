const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const ApiError = require("../utils/ApiError");
const { generateText } = require("./ai/llm.client");
const { logUsage } = require("./usage.service");
const prompts = require("./ai/prompts/assistant.prompt");

const MAX_MESSAGES = 200; // per chat, keeps one document small
const CONTEXT = 20; // how many earlier messages the AI sees (keeps cost down). Must be even so it starts with a user message.

const assertValidId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid chat id");
};

// Every query includes the owner, so nobody can open another user's chat
const findOwned = async (userId, id) => {
  assertValidId(id);
  const chat = await Conversation.findOne({ _id: id, user: userId });
  if (!chat) throw new ApiError(404, "Chat not found");
  return chat;
};

const makeTitle = (message) => {
  const t = message.replace(/\s+/g, " ").trim();
  return t.length > 50 ? `${t.slice(0, 50)}…` : t;
};

const list = (userId) =>
  Conversation.aggregate([
    { $match: { user: userId } },
    { $sort: { updatedAt: -1 } },
    { $limit: 50 },
    {
      $project: {
        title: 1,
        mode: 1,
        createdAt: 1,
        updatedAt: 1,
        messageCount: { $size: "$messages" },
      },
    },
  ]);

const create = (userId, { mode, title }) =>
  Conversation.create({ user: userId, mode, ...(title && { title }) });

const get = (userId, id) => findOwned(userId, id);

const update = async (userId, id, data) => {
  assertValidId(id);
  const chat = await Conversation.findOneAndUpdate(
    { _id: id, user: userId },
    data,
    {
      returnDocument: "after",
      runValidators: true,
    },
  ).select("-messages");
  if (!chat) throw new ApiError(404, "Chat not found");
  return chat;
};

const remove = async (userId, id) => {
  assertValidId(id);
  const chat = await Conversation.findOneAndDelete({ _id: id, user: userId });
  if (!chat) throw new ApiError(404, "Chat not found");
};

const sendMessage = async (userId, id, message) => {
  const chat = await findOwned(userId, id);
  if (chat.messages.length >= MAX_MESSAGES)
    throw new ApiError(400, "This chat is full. Please start a new chat.");

  const history = chat.messages
    .slice(-CONTEXT)
    .map((m) => ({ role: m.role, text: m.text }));

  const { text, usage } = await generateText({
    system: prompts[chat.mode],
    messages: [...history, { role: "user", text: message }],
    maxTokens: chat.mode === "math" ? 2500 : 1500,
  });
  await logUsage(userId, "assistant", usage); // you paid for these tokens even if the reply turns out empty

  const reply = text.trim().slice(0, 12000);
  if (!reply) throw new ApiError(502, "AI returned an empty response");

  // Saved together only after the AI answered, so a failed call leaves no half-finished chat
  chat.messages.push(
    { role: "user", text: message },
    { role: "assistant", text: reply },
  );
  if (chat.title === "New chat") chat.title = makeTitle(message);
  await chat.save();

  return { messages: chat.messages.slice(-2), title: chat.title };
};

module.exports = { list, create, get, update, remove, sendMessage };
