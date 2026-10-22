const request = require("supertest");
const app = require("../src/app");
const Note = require("../src/models/Note");
const Flashcard = require("../src/models/Flashcard");
const Quiz = require("../src/models/Quiz");
const { connectTestDB, clearDB, closeDB } = require("./helpers/db");
const { registerUser } = require("./helpers/auth");
const { createNote, authed } = require("./helpers/notes");

const api = "/api/v1/notes";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let token, user, noteId;

beforeAll(connectTestDB);
beforeEach(async () => {
  await clearDB();
  ({ token, user } = await registerUser());
  noteId = (await createNote(token)).body.note._id;
});
afterAll(closeDB);

const registerOther = () =>
  registerUser({ name: "Other User", email: "other@example.com" });
const card = (note, question, owner = user.id) => ({
  user: owner,
  note,
  question,
  answer: `answer to ${question}`,
});
const quizDoc = (note, text, owner = user.id) => ({
  user: owner,
  note,
  questions: [
    { question: text, options: ["1", "2", "3", "4"], correctIndex: 0 },
  ],
});

describe("GET /notes/:id/flashcards", () => {
  test("lists the cards of this note only, oldest first", async () => {
    const otherNote = (await createNote(token, { title: "Other note" })).body
      .note._id;
    await Flashcard.create([card(noteId, "q1"), card(noteId, "q2")]);
    await Flashcard.create([card(otherNote, "not-mine")]);

    const res = await authed("get", `${api}/${noteId}/flashcards`, token);

    expect(res.status).toBe(200);
    expect(res.body.cards.map((c) => c.question)).toEqual(["q1", "q2"]);
  });

  test("returns an empty list for a note with no cards", async () => {
    const res = await authed("get", `${api}/${noteId}/flashcards`, token);

    expect(res.status).toBe(200);
    expect(res.body.cards).toEqual([]);
  });

  test("another user's note gives 404", async () => {
    await Flashcard.create([card(noteId, "secret")]);
    const other = await registerOther();
    const res = await authed("get", `${api}/${noteId}/flashcards`, other.token);

    expect(res.status).toBe(404);
  });

  test("rejects an invalid id (400)", async () => {
    const res = await authed("get", `${api}/123/flashcards`, token);
    expect(res.status).toBe(400);
  });

  test("rejects a request with no token (401)", async () => {
    const res = await request(app).get(`${api}/${noteId}/flashcards`);
    expect(res.status).toBe(401);
  });
});

describe("DELETE /notes/:id/flashcards", () => {
  test("clears the cards of this note only (204)", async () => {
    const otherNote = (await createNote(token, { title: "Other note" })).body
      .note._id;
    await Flashcard.create([
      card(noteId, "q1"),
      card(noteId, "q2"),
      card(otherNote, "keep-me"),
    ]);

    const res = await authed("delete", `${api}/${noteId}/flashcards`, token);

    expect(res.status).toBe(204);
    expect(await Flashcard.countDocuments({ note: noteId })).toBe(0);
    expect(await Flashcard.countDocuments({ note: otherNote })).toBe(1);
  });

  test("another user cannot clear your cards (404) and nothing is deleted", async () => {
    await Flashcard.create([card(noteId, "q1")]);
    const other = await registerOther();
    const res = await authed(
      "delete",
      `${api}/${noteId}/flashcards`,
      other.token,
    );

    expect(res.status).toBe(404);
    expect(await Flashcard.countDocuments({ note: noteId })).toBe(1);
  });
});

describe("GET /notes/:id/quizzes", () => {
  test("lists saved quizzes, newest first", async () => {
    await Quiz.create(quizDoc(noteId, "first"));
    await wait(5);
    await Quiz.create(quizDoc(noteId, "second"));

    const res = await authed("get", `${api}/${noteId}/quizzes`, token);

    expect(res.status).toBe(200);
    expect(res.body.quizzes.map((q) => q.questions[0].question)).toEqual([
      "second",
      "first",
    ]);
  });

  test("returns at most 10 quizzes", async () => {
    await Quiz.insertMany(
      Array.from({ length: 12 }, (_, i) => quizDoc(noteId, `q${i}`)),
    );

    const res = await authed("get", `${api}/${noteId}/quizzes`, token);
    expect(res.body.quizzes).toHaveLength(10);
  });

  test("another user's note gives 404", async () => {
    await Quiz.create(quizDoc(noteId, "secret"));
    const other = await registerOther();
    const res = await authed("get", `${api}/${noteId}/quizzes`, other.token);

    expect(res.status).toBe(404);
  });
});

describe("deleting a note", () => {
  test("also deletes its flashcards and quizzes, and leaves other notes alone", async () => {
    const keep = (await createNote(token, { title: "Keep me" })).body.note._id;
    await Flashcard.create([card(noteId, "gone"), card(keep, "stays")]);
    await Quiz.create(quizDoc(noteId, "gone"));
    await Quiz.create(quizDoc(keep, "stays"));

    const res = await authed("delete", `${api}/${noteId}`, token);

    expect(res.status).toBe(204);
    expect(await Note.countDocuments({ _id: noteId })).toBe(0);
    expect(await Flashcard.countDocuments({ note: noteId })).toBe(0);
    expect(await Quiz.countDocuments({ note: noteId })).toBe(0);
    expect(await Flashcard.countDocuments({ note: keep })).toBe(1);
    expect(await Quiz.countDocuments({ note: keep })).toBe(1);
  });
});
