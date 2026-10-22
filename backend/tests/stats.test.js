const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const Flashcard = require("../src/models/Flashcard");
const Quiz = require("../src/models/Quiz");
const UsageLog = require("../src/models/UsageLog");
const { connectTestDB, clearDB, closeDB } = require("./helpers/db");
const { registerUser } = require("./helpers/auth");
const { createNote } = require("./helpers/notes");

const DAY = 24 * 60 * 60 * 1000;
let token, user;

beforeAll(connectTestDB);
beforeEach(async () => {
  await clearDB();
  ({ token, user } = await registerUser());
});
afterAll(closeDB);

const getStats = (tok = token) =>
  request(app).get("/api/v1/stats").set("Authorization", `Bearer ${tok}`);
const log = (feature, inputTokens, outputTokens, owner = user.id) =>
  UsageLog.create({
    user: owner,
    feature,
    model: "test-model",
    inputTokens,
    outputTokens,
  });

describe("GET /stats", () => {
  test("rejects a request with no token (401)", async () => {
    const res = await request(app).get("/api/v1/stats");
    expect(res.status).toBe(401);
  });

  test("a new user gets zeros, an empty list and exactly 7 empty days", async () => {
    const res = await getStats();
    const { totals, byFeature, last7Days, topTags } = res.body.stats;

    expect(res.status).toBe(200);
    expect(totals).toEqual({ notes: 0, flashcards: 0, quizzes: 0 });
    expect(byFeature).toEqual([]);
    expect(topTags).toEqual([]);
    expect(last7Days).toHaveLength(7);
    expect(last7Days.every((d) => d.requests === 0)).toBe(true);
  });

  test("counts your notes, cards, quizzes, usage per feature and top tags", async () => {
    const a = (
      await createNote(token, { title: "A", tags: ["biology", "plants"] })
    ).body.note;
    await createNote(token, { title: "B", tags: ["biology"] });
    await Flashcard.create([
      { user: user.id, note: a._id, question: "q1", answer: "a1" },
      { user: user.id, note: a._id, question: "q2", answer: "a2" },
    ]);
    await Quiz.create({
      user: user.id,
      note: a._id,
      questions: [
        { question: "q", options: ["1", "2", "3", "4"], correctIndex: 0 },
      ],
    });
    await log("summarize", 100, 50);
    await log("summarize", 10, 5);
    await log("chat", 20, 10);

    const { stats } = (await getStats()).body;
    const byName = Object.fromEntries(
      stats.byFeature.map((f) => [f.feature, f]),
    );

    expect(stats.totals).toEqual({ notes: 2, flashcards: 2, quizzes: 1 });
    expect(byName.summarize).toMatchObject({
      requests: 2,
      inputTokens: 110,
      outputTokens: 55,
    });
    expect(byName.chat).toMatchObject({
      requests: 1,
      inputTokens: 20,
      outputTokens: 10,
    });
    expect(stats.topTags).toEqual([
      { tag: "biology", count: 2 },
      { tag: "plants", count: 1 },
    ]);
  });

  test("last7Days: 7 ascending dates, today holds today's calls, older calls are left out", async () => {
    await log("summarize", 1, 1);
    await log("summarize", 1, 1);
    await log("chat", 1, 1);
    const old = new Date(Date.now() - 10 * DAY);
    await UsageLog.collection.insertOne({
      user: new mongoose.Types.ObjectId(user.id),
      feature: "summarize",
      model: "m",
      inputTokens: 1,
      outputTokens: 1,
      createdAt: old,
      updatedAt: old,
    });

    const { stats } = (await getStats()).body;
    const dates = stats.last7Days.map((d) => d.date);
    const total = stats.last7Days.reduce((sum, d) => sum + d.requests, 0);
    const summarize = stats.byFeature.find((f) => f.feature === "summarize");

    expect(new Set(dates).size).toBe(7);
    expect([...dates].sort()).toEqual(dates);
    expect(stats.last7Days[6].requests).toBe(3);
    expect(total).toBe(3); // the 10-day-old call is not in the chart...
    expect(summarize.requests).toBe(3); // ...but it still counts in the all-time totals (2 today + 1 old)
  });

  test("never includes other users' data", async () => {
    const other = await registerUser({
      name: "Other User",
      email: "other@example.com",
    });
    await createNote(other.token, { title: "Private", tags: ["secret"] });
    await log("chat", 500, 500, other.user.id);

    const { stats } = (await getStats()).body;

    expect(stats.totals).toEqual({ notes: 0, flashcards: 0, quizzes: 0 });
    expect(stats.byFeature).toEqual([]);
    expect(stats.topTags).toEqual([]);
  });
});
