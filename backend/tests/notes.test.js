const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const Note = require("../src/models/Note");
const { connectTestDB, clearDB, closeDB } = require("./helpers/db");
const { registerUser } = require("./helpers/auth");
const { createNote, authed } = require("./helpers/notes");

const api = "/api/v1/notes";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let token, user;

beforeAll(connectTestDB);
beforeEach(async () => {
  await clearDB();
  ({ token, user } = await registerUser()); // a fresh logged-in user for every test
});
afterAll(closeDB);

const registerOther = () =>
  registerUser({ name: "Other User", email: "other@example.com" });

describe("POST /notes", () => {
  test("creates a note owned by the logged-in user", async () => {
    const res = await createNote(token);

    expect(res.status).toBe(201);
    expect(res.body.note).toMatchObject({
      title: "Photosynthesis",
      user: user.id,
      summary: "",
    });
  });

  test("cleans tags: lowercase, trimmed, no duplicates", async () => {
    const res = await createNote(token, {
      tags: [" Biology ", "biology", "PLANTS"],
    });
    expect(res.body.note.tags).toEqual(["biology", "plants"]);
  });

  test("ignores 'user' and 'summary' sent by the client", async () => {
    const other = await registerOther();
    const res = await createNote(token, {
      user: other.user.id,
      summary: "hacked",
    });

    expect(res.status).toBe(201);
    expect(res.body.note.user).toBe(user.id); // still owned by the real user
    expect(res.body.note.summary).toBe("");
  });

  test("rejects a missing title (400)", async () => {
    const res = await request(app)
      .post(api)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "text" });
    expect(res.status).toBe(400);
  });

  test("rejects a title longer than 120 characters (400)", async () => {
    const res = await createNote(token, { title: "a".repeat(121) });
    expect(res.status).toBe(400);
  });

  test("rejects empty content (400)", async () => {
    const res = await createNote(token, { content: "" });
    expect(res.status).toBe(400);
  });

  test("rejects more than 10 tags (400)", async () => {
    const res = await createNote(token, {
      tags: Array.from({ length: 11 }, (_, i) => `t${i}`),
    });
    expect(res.status).toBe(400);
  });

  test("rejects a request with no token (401)", async () => {
    const res = await request(app).post(api).send({ title: "x", content: "y" });
    expect(res.status).toBe(401);
  });
});

describe("GET /notes", () => {
  test("returns an empty list for a new user", async () => {
    const res = await authed("get", api, token);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ notes: [], total: 0, page: 1, pages: 0 });
  });

  test("returns newest notes first", async () => {
    await createNote(token, { title: "First" });
    await wait(5); // make sure the timestamps differ
    await createNote(token, { title: "Second" });

    const res = await authed("get", api, token);
    expect(res.body.notes.map((n) => n.title)).toEqual(["Second", "First"]);
  });

  test("paginates results", async () => {
    for (const title of ["A", "B", "C"]) await createNote(token, { title });

    const p1 = await authed("get", `${api}?limit=2&page=1`, token);
    const p2 = await authed("get", `${api}?limit=2&page=2`, token);

    expect(p1.body.notes).toHaveLength(2);
    expect(p1.body).toMatchObject({ total: 3, pages: 2 });
    expect(p2.body.notes).toHaveLength(1);
  });

  test("falls back to safe defaults for nonsense page and limit", async () => {
    const res = await authed("get", `${api}?page=-5&limit=abc`, token);

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
  });
});

describe("GET /notes/:id", () => {
  test("returns one of your notes", async () => {
    const { body } = await createNote(token);
    const res = await authed("get", `${api}/${body.note._id}`, token);

    expect(res.status).toBe(200);
    expect(res.body.note.title).toBe("Photosynthesis");
  });

  test("rejects an invalid id with 400", async () => {
    const res = await authed("get", `${api}/123`, token);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid note id");
  });

  test("returns 404 for an id that does not exist", async () => {
    const res = await authed(
      "get",
      `${api}/${new mongoose.Types.ObjectId()}`,
      token,
    );
    expect(res.status).toBe(404);
  });
});

describe("PATCH /notes/:id", () => {
  test("updates only the fields you send", async () => {
    const { body } = await createNote(token);
    const res = await authed("patch", `${api}/${body.note._id}`, token).send({
      title: "New title",
    });

    expect(res.status).toBe(200);
    expect(res.body.note.title).toBe("New title");
    expect(res.body.note.content).toBe("Plants make food using sunlight");
  });

  test("rejects an empty body (400)", async () => {
    const { body } = await createNote(token);
    const res = await authed("patch", `${api}/${body.note._id}`, token).send(
      {},
    );
    expect(res.status).toBe(400);
  });

  test("rejects an empty title (400)", async () => {
    const { body } = await createNote(token);
    const res = await authed("patch", `${api}/${body.note._id}`, token).send({
      title: "",
    });
    expect(res.status).toBe(400);
  });

  test("cannot move a note to another user through the body", async () => {
    const other = await registerOther();
    const { body } = await createNote(token);
    await authed("patch", `${api}/${body.note._id}`, token).send({
      user: other.user.id,
      title: "x",
    });

    const saved = await Note.findById(body.note._id);
    expect(saved.user.toString()).toBe(user.id);
  });
});

describe("DELETE /notes/:id", () => {
  test("deletes the note (204), then it is gone (404)", async () => {
    const { body } = await createNote(token);
    const del = await authed("delete", `${api}/${body.note._id}`, token);
    const after = await authed("get", `${api}/${body.note._id}`, token);

    expect(del.status).toBe(204);
    expect(after.status).toBe(404);
  });

  test("returns 404 for an id that does not exist", async () => {
    const res = await authed(
      "delete",
      `${api}/${new mongoose.Types.ObjectId()}`,
      token,
    );
    expect(res.status).toBe(404);
  });
});

describe("isolation between users", () => {
  test("another user cannot read, edit or delete your note", async () => {
    const { body } = await createNote(token, { title: "Private" });
    const other = await registerOther();
    const url = `${api}/${body.note._id}`;

    expect((await authed("get", url, other.token)).status).toBe(404);
    expect(
      (await authed("patch", url, other.token).send({ title: "Hacked" }))
        .status,
    ).toBe(404);
    expect((await authed("delete", url, other.token)).status).toBe(404);

    const saved = await Note.findById(body.note._id); // still exists and unchanged
    expect(saved.title).toBe("Private");
  });

  test("another user never sees your notes in list, search or tags", async () => {
    await createNote(token, { title: "Private", tags: ["secret"] });
    const other = await registerOther();

    const list = await authed("get", api, other.token);
    const search = await authed("get", `${api}?q=Private`, other.token);
    const tags = await authed("get", `${api}/tags`, other.token);

    expect(list.body.total).toBe(0);
    expect(search.body.total).toBe(0);
    expect(tags.body.tags).toEqual([]);
  });
});

describe("search and tags", () => {
  beforeEach(async () => {
    await createNote(token, {
      title: "Photosynthesis",
      content: "Chlorophyll absorbs light",
      tags: ["biology", "plants"],
    });
    await createNote(token, {
      title: "Internet",
      content: "Packets travel through routers",
      tags: ["tech"],
    });
  });

  test("searches the title, ignoring upper/lower case", async () => {
    const res = await authed("get", `${api}?q=PHOTO`, token);

    expect(res.body.total).toBe(1);
    expect(res.body.notes[0].title).toBe("Photosynthesis");
  });

  test("searches the content", async () => {
    const res = await authed("get", `${api}?q=routers`, token);
    expect(res.body.notes[0].title).toBe("Internet");
  });

  test("searches the tags too", async () => {
    const res = await authed("get", `${api}?q=biol`, token);
    expect(res.body.notes[0].title).toBe("Photosynthesis");
  });

  test("special characters are searched as plain text and never crash", async () => {
    const res = await authed("get", `${api}?q=((`, token);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });

  test("a dot is not a wildcard", async () => {
    await createNote(token, { title: "Wildcard", content: "abc", tags: [] });
    const res = await authed("get", `${api}?q=a.c`, token); // would match "abc" if it were a regex

    expect(res.body.total).toBe(0);
  });

  test("filters by tag, and combines tag with search", async () => {
    const byTag = await authed("get", `${api}?tag=Biology`, token); // tag filter is case-insensitive
    const both = await authed("get", `${api}?tag=biology&q=routers`, token);

    expect(byTag.body.total).toBe(1);
    expect(both.body.total).toBe(0);
  });

  test("survives array query values like ?q[]=x", async () => {
    const res = await authed("get", `${api}?q[]=x&tag[]=y`, token);
    expect(res.status).toBe(200);
  });

  test("GET /notes/tags counts tags, most used first (and is not caught by /:id)", async () => {
    await createNote(token, {
      title: "Cells",
      content: "Cells are small",
      tags: ["biology"],
    });
    const res = await authed("get", `${api}/tags`, token);

    expect(res.status).toBe(200);
    expect(res.body.tags).toEqual([
      { tag: "biology", count: 2 },
      { tag: "plants", count: 1 },
      { tag: "tech", count: 1 },
    ]);
  });
});
