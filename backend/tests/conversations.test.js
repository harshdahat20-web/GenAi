// The real AI is replaced with a fake BEFORE the app loads
jest.mock("../src/services/ai/llm.client", () => ({ generateText: jest.fn() }));

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const { generateText } = require("../src/services/ai/llm.client");
const ApiError = require("../src/utils/ApiError");
const Conversation = require("../src/models/Conversation");
const UsageLog = require("../src/models/UsageLog");
const { connectTestDB, clearDB, closeDB } = require("./helpers/db");
const { registerUser } = require("./helpers/auth");
const { authed } = require("./helpers/notes");

const api = "/api/v1/chats";
let token, user;

const reply = (text, usage = { inputTokens: 40, outputTokens: 20 }) =>
  generateText.mockResolvedValueOnce({ text, usage });
const registerOther = () =>
  registerUser({ name: "Other User", email: "other@example.com" });
const makeChat = async (body = {}, tok = token) =>
  (await authed("post", api, tok).send(body)).body.chat;
const send = (id, message, tok = token) =>
  authed("post", `${api}/${id}/messages`, tok).send({ message });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const seed = (count, owner = user.id) =>
  Conversation.create({
    user: owner,
    title: "Seeded",
    messages: Array.from({ length: count }, (_, i) => ({
      role: i % 2 ? "assistant" : "user",
      text: `m-${i}`,
    })),
  });

beforeAll(connectTestDB);
beforeEach(async () => {
  await clearDB();
  generateText.mockReset();
  ({ token, user } = await registerUser());
});
afterAll(closeDB);

describe("POST /chats", () => {
  test("creates an empty chat with defaults", async () => {
    const res = await authed("post", api, token).send({});

    expect(res.status).toBe(201);
    expect(res.body.chat).toMatchObject({
      title: "New chat",
      mode: "chat",
      messages: [],
    });
  });

  test("creates a chat in math mode", async () => {
    const chat = await makeChat({ mode: "math" });
    expect(chat.mode).toBe("math");
  });

  test("rejects an unknown mode (400)", async () => {
    const res = await authed("post", api, token).send({ mode: "hacker" });
    expect(res.status).toBe(400);
  });

  test("rejects a request with no token (401)", async () => {
    const res = await request(app).post(api).send({});
    expect(res.status).toBe(401);
  });
});

describe("GET /chats", () => {
  test("returns an empty list for a new user", async () => {
    const res = await authed("get", api, token);

    expect(res.status).toBe(200);
    expect(res.body.chats).toEqual([]);
  });

  test("lists only your chats, newest activity first, without the message text", async () => {
    const older = await makeChat({ title: "Older" });
    await wait(5);
    await makeChat({ title: "Newer" });
    const other = await registerOther();
    await makeChat({ title: "Not yours" }, other.token);
    reply("hello");
    await send(older._id, "hi there"); // gives "Older" the newest activity

    const res = await authed("get", api, token);

    expect(res.body.chats.map((c) => c.title)).toEqual(["Older", "Newer"]);
    expect(res.body.chats[0].messageCount).toBe(2);
    expect(res.body.chats[0].messages).toBeUndefined();
  });
});

describe("GET /chats/:id", () => {
  test("returns the chat with its messages", async () => {
    const conv = await seed(4);
    const res = await authed("get", `${api}/${conv._id}`, token);

    expect(res.status).toBe(200);
    expect(res.body.chat.messages.map((m) => m.text)).toEqual([
      "m-0",
      "m-1",
      "m-2",
      "m-3",
    ]);
  });

  test("another user gets 404", async () => {
    const conv = await seed(2);
    const other = await registerOther();
    const res = await authed("get", `${api}/${conv._id}`, other.token);
    expect(res.status).toBe(404);
  });

  test("rejects an invalid id (400)", async () => {
    const res = await authed("get", `${api}/123`, token);
    expect(res.status).toBe(400);
  });
});

describe("PATCH /chats/:id", () => {
  test("renames a chat and trims the title", async () => {
    const chat = await makeChat();
    const res = await authed("patch", `${api}/${chat._id}`, token).send({
      title: "  Calculus help  ",
    });

    expect(res.status).toBe(200);
    expect(res.body.chat.title).toBe("Calculus help");
    expect(res.body.chat.messages).toBeUndefined();
  });

  test("switches the mode", async () => {
    const chat = await makeChat();
    const res = await authed("patch", `${api}/${chat._id}`, token).send({
      mode: "math",
    });
    expect(res.body.chat.mode).toBe("math");
  });

  test("rejects an empty title and an empty body (400)", async () => {
    const chat = await makeChat();
    const emptyTitle = await authed("patch", `${api}/${chat._id}`, token).send({
      title: "   ",
    });
    const emptyBody = await authed("patch", `${api}/${chat._id}`, token).send(
      {},
    );

    expect(emptyTitle.status).toBe(400);
    expect(emptyBody.status).toBe(400);
  });

  test("another user cannot rename your chat (404) and nothing changes", async () => {
    const chat = await makeChat({ title: "Mine" });
    const other = await registerOther();
    const res = await authed("patch", `${api}/${chat._id}`, other.token).send({
      title: "Hacked",
    });

    expect(res.status).toBe(404);
    expect((await Conversation.findById(chat._id)).title).toBe("Mine");
  });
});

describe("DELETE /chats/:id", () => {
  test("deletes the chat (204), then it is gone (404)", async () => {
    const chat = await makeChat();
    const del = await authed("delete", `${api}/${chat._id}`, token);
    const after = await authed("get", `${api}/${chat._id}`, token);

    expect(del.status).toBe(204);
    expect(after.status).toBe(404);
  });

  test("another user cannot delete your chat (404) and it still exists", async () => {
    const chat = await makeChat();
    const other = await registerOther();
    const res = await authed("delete", `${api}/${chat._id}`, other.token);

    expect(res.status).toBe(404);
    expect(await Conversation.countDocuments({ _id: chat._id })).toBe(1);
  });
});

describe("POST /chats/:id/messages", () => {
  test("saves your message and the AI's answer, and returns both", async () => {
    const chat = await makeChat();
    reply("  It is 2x.  ");
    const res = await send(chat._id, "What is the derivative of x squared?");

    expect(res.status).toBe(201);
    expect(res.body.messages.map((m) => [m.role, m.text])).toEqual([
      ["user", "What is the derivative of x squared?"],
      ["assistant", "It is 2x."],
    ]);
    expect((await Conversation.findById(chat._id)).messages).toHaveLength(2);
  });

  test("names a new chat after the first message (and cleans up spaces)", async () => {
    const chat = await makeChat();
    reply("ok");
    const res = await send(
      chat._id,
      "  What is   the derivative of x squared?  ",
    );

    expect(res.body.title).toBe("What is the derivative of x squared?");
  });

  test("shortens a long first message in the title", async () => {
    const chat = await makeChat();
    reply("ok");
    const res = await send(chat._id, "a".repeat(100));

    expect(res.body.title).toBe(`${"a".repeat(50)}…`);
  });

  test("does not rename a chat that already has a title", async () => {
    const chat = await makeChat({ title: "My title" });
    reply("ok");
    const res = await send(chat._id, "hello");

    expect(res.body.title).toBe("My title");
  });

  test("uses different instructions for chat mode and math mode", async () => {
    const normal = await makeChat({ mode: "chat" });
    const maths = await makeChat({ mode: "math" });
    reply("a");
    reply("b");
    await send(normal._id, "hi");
    await send(maths._id, "2+2");

    expect(generateText.mock.calls[0][0].system).toContain("friendly");
    expect(generateText.mock.calls[1][0].system).toContain("maths tutor");
  });

  test("sends the earlier messages to the AI, in order", async () => {
    const chat = await makeChat();
    reply("first answer");
    reply("second answer");
    await send(chat._id, "first question");
    await send(chat._id, "second question");

    const { messages } = generateText.mock.calls[1][0];
    expect(messages.map((m) => [m.role, m.text])).toEqual([
      ["user", "first question"],
      ["assistant", "first answer"],
      ["user", "second question"],
    ]);
  });

  test("sends only the last 20 earlier messages (keeps cost down)", async () => {
    const conv = await seed(30);
    reply("ok");
    await send(conv._id, "new question");

    const { messages } = generateText.mock.calls[0][0];
    expect(messages).toHaveLength(21);
    expect(messages[0]).toEqual({ role: "user", text: "m-10" });
    expect(messages[20]).toEqual({ role: "user", text: "new question" });
  });

  test("records usage as 'assistant'", async () => {
    const chat = await makeChat();
    reply("ok");
    await send(chat._id, "hi");

    expect(
      await UsageLog.countDocuments({ feature: "assistant", user: user.id }),
    ).toBe(1);
  });

  test("returns 502 when the AI fails and saves nothing", async () => {
    const chat = await makeChat();
    generateText.mockRejectedValueOnce(
      new ApiError(502, "AI service is unavailable. Please try again."),
    );
    const res = await send(chat._id, "hello");

    expect(res.status).toBe(502);
    expect((await Conversation.findById(chat._id)).messages).toHaveLength(0);
  });

  test("rejects an empty or very long message (400) without calling the AI", async () => {
    const chat = await makeChat();
    const empty = await send(chat._id, "   ");
    const huge = await send(chat._id, "a".repeat(4001));

    expect(empty.status).toBe(400);
    expect(huge.status).toBe(400);
    expect(generateText).not.toHaveBeenCalled();
  });

  test("another user gets 404 and the AI is never called", async () => {
    const chat = await makeChat();
    const other = await registerOther();
    const res = await send(chat._id, "hi", other.token);

    expect(res.status).toBe(404);
    expect(generateText).not.toHaveBeenCalled();
  });

  test("a full chat is refused (400) without calling the AI", async () => {
    const conv = await seed(200);
    const res = await send(conv._id, "one more");

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/full/i);
    expect(generateText).not.toHaveBeenCalled();
  });

  test("rejects an invalid id (400)", async () => {
    const res = await send("123", "hi");
    expect(res.status).toBe(400);
  });
});
