const request = require("supertest");
const app = require("../src/app");
const Resume = require("../src/models/Resume");
const { connectTestDB, clearDB, closeDB } = require("./helpers/db");
const { registerUser } = require("./helpers/auth");
const { authed } = require("./helpers/notes");

const api = "/api/v1/resumes";
let token, user;

beforeAll(connectTestDB);
beforeEach(async () => {
  await clearDB();
  ({ token, user } = await registerUser());
});
afterAll(closeDB);

const registerOther = () =>
  registerUser({ name: "Other User", email: "other@example.com" });
const make = async (body = {}, tok = token) =>
  (await authed("post", api, tok).send(body)).body.resume;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

describe("POST /resumes", () => {
  test("creates a blank resume with sensible defaults", async () => {
    const res = await authed("post", api, token).send({});

    expect(res.status).toBe(201);
    expect(res.body.resume).toMatchObject({
      title: "My resume",
      template: "classic",
      skills: [],
      experience: [],
      education: [],
      projects: [],
    });
    expect(res.body.resume.personal.name).toBe("");
  });

  test("creates a resume with data and trims the text", async () => {
    const resume = await make({
      title: "  Backend CV  ",
      personal: { name: " Asha ", email: "asha@example.com" },
      skills: [" React ", "Node.js"],
      experience: [
        { company: "Acme", role: "Developer", bullets: ["Built an API"] },
      ],
    });

    expect(resume.title).toBe("Backend CV");
    expect(resume.personal.name).toBe("Asha");
    expect(resume.skills).toEqual(["React", "Node.js"]);
    expect(resume.experience[0].bullets).toEqual(["Built an API"]);
  });

  test("ignores a 'user' sent by the client", async () => {
    const other = await registerOther();
    const resume = await make({ user: other.user.id });
    expect(resume.user).toBe(user.id);
  });

  test("rejects an unknown template (400)", async () => {
    const res = await authed("post", api, token).send({ template: "fancy" });
    expect(res.status).toBe(400);
  });

  test("rejects an invalid email (400)", async () => {
    const res = await authed("post", api, token).send({
      personal: { email: "not-an-email" },
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  test("rejects more than 10 experience entries (400)", async () => {
    const experience = Array.from({ length: 11 }, () => ({
      company: "A",
      role: "B",
    }));
    const res = await authed("post", api, token).send({ experience });
    expect(res.status).toBe(400);
  });

  test("rejects a bullet longer than 300 characters (400)", async () => {
    const res = await authed("post", api, token).send({
      experience: [{ company: "A", role: "B", bullets: ["x".repeat(301)] }],
    });
    expect(res.status).toBe(400);
  });

  test("rejects a request with no token (401)", async () => {
    const res = await request(app).post(api).send({});
    expect(res.status).toBe(401);
  });

  test("stops at 10 resumes per user (400)", async () => {
    await Resume.insertMany(
      Array.from({ length: 10 }, (_, i) => ({ user: user.id, title: `R${i}` })),
    );
    const res = await authed("post", api, token).send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/up to 10/);
  });
});

describe("GET /resumes", () => {
  test("lists only your resumes, most recently edited first, without the heavy fields", async () => {
    await make({ title: "A", skills: ["x"] });
    await wait(5);
    await make({ title: "B" });
    const other = await registerOther();
    await make({ title: "Not yours" }, other.token);

    const res = await authed("get", api, token);

    expect(res.body.resumes.map((r) => r.title)).toEqual(["B", "A"]);
    expect(res.body.resumes[0].skills).toBeUndefined();
    expect(res.body.resumes[0].experience).toBeUndefined();
  });
});

describe("GET /resumes/:id", () => {
  test("returns the whole resume", async () => {
    const resume = await make({ skills: ["React"] });
    const res = await authed("get", `${api}/${resume._id}`, token);

    expect(res.status).toBe(200);
    expect(res.body.resume.skills).toEqual(["React"]);
  });

  test("another user gets 404", async () => {
    const resume = await make();
    const other = await registerOther();
    const res = await authed("get", `${api}/${resume._id}`, other.token);
    expect(res.status).toBe(404);
  });

  test("rejects an invalid id (400)", async () => {
    const res = await authed("get", `${api}/123`, token);
    expect(res.status).toBe(400);
  });
});

describe("PATCH /resumes/:id", () => {
  test("changes only the fields you send", async () => {
    const resume = await make({ title: "Old", skills: ["React"] });
    const res = await authed("patch", `${api}/${resume._id}`, token).send({
      title: "New",
    });

    expect(res.status).toBe(200);
    expect(res.body.resume).toMatchObject({ title: "New", skills: ["React"] });
  });

  test("merges 'personal' field by field", async () => {
    const resume = await make({ personal: { name: "Asha", phone: "123" } });
    const res = await authed("patch", `${api}/${resume._id}`, token).send({
      personal: { phone: "999" },
    });

    expect(res.body.resume.personal).toMatchObject({
      name: "Asha",
      phone: "999",
    });
  });

  test("replaces a whole section such as experience", async () => {
    const resume = await make({
      experience: [
        { company: "A", role: "x" },
        { company: "B", role: "y" },
      ],
    });
    const res = await authed("patch", `${api}/${resume._id}`, token).send({
      experience: [{ company: "C", role: "z" }],
    });

    expect(res.body.resume.experience).toHaveLength(1);
    expect(res.body.resume.experience[0].company).toBe("C");
  });

  test("an empty body is rejected (400), an empty 'personal' changes nothing (200)", async () => {
    const resume = await make({ title: "Keep" });
    const empty = await authed("patch", `${api}/${resume._id}`, token).send({});
    const noop = await authed("patch", `${api}/${resume._id}`, token).send({
      personal: {},
    });

    expect(empty.status).toBe(400);
    expect(noop.status).toBe(200);
    expect(noop.body.resume.title).toBe("Keep");
  });

  test("another user cannot edit your resume (404) and nothing changes", async () => {
    const resume = await make({ title: "Mine" });
    const other = await registerOther();
    const res = await authed("patch", `${api}/${resume._id}`, other.token).send(
      { title: "Hacked" },
    );

    expect(res.status).toBe(404);
    expect((await Resume.findById(resume._id)).title).toBe("Mine");
  });
});

describe("DELETE /resumes/:id", () => {
  test("deletes the resume (204), then it is gone (404)", async () => {
    const resume = await make();
    const del = await authed("delete", `${api}/${resume._id}`, token);
    const after = await authed("get", `${api}/${resume._id}`, token);

    expect(del.status).toBe(204);
    expect(after.status).toBe(404);
  });

  test("another user cannot delete your resume (404) and it still exists", async () => {
    const resume = await make();
    const other = await registerOther();
    const res = await authed("delete", `${api}/${resume._id}`, other.token);

    expect(res.status).toBe(404);
    expect(await Resume.countDocuments({ _id: resume._id })).toBe(1);
  });
});

describe("POST /resumes/:id/duplicate", () => {
  test("makes a copy with the same data, a new id and '(copy)' in the title", async () => {
    const original = await make({
      title: "CV",
      skills: ["React"],
      experience: [{ company: "Acme", role: "Dev", bullets: ["Built an API"] }],
    });
    const res = await authed("post", `${api}/${original._id}/duplicate`, token);

    expect(res.status).toBe(201);
    expect(res.body.resume._id).not.toBe(original._id);
    expect(res.body.resume.title).toBe("CV (copy)");
    expect(res.body.resume.skills).toEqual(["React"]);
    expect(res.body.resume.experience[0].bullets).toEqual(["Built an API"]);
    expect(await Resume.countDocuments({ user: user.id })).toBe(2);
  });

  test("another user cannot copy your resume (404)", async () => {
    const original = await make();
    const other = await registerOther();
    const res = await authed(
      "post",
      `${api}/${original._id}/duplicate`,
      other.token,
    );
    expect(res.status).toBe(404);
  });

  test("is blocked when you already have 10 resumes (400)", async () => {
    await Resume.insertMany(
      Array.from({ length: 10 }, (_, i) => ({ user: user.id, title: `R${i}` })),
    );
    const one = await Resume.findOne({ user: user.id });
    const res = await authed("post", `${api}/${one._id}/duplicate`, token);

    expect(res.status).toBe(400);
  });
});
