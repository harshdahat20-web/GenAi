const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const { connectTestDB, closeDB } = require("./helpers/db");

beforeAll(connectTestDB);
afterAll(closeDB);

describe("basics", () => {
  test("connects to the test database", () => {
    expect(mongoose.connection.readyState).toBe(1);
    expect(mongoose.connection.name).toMatch(/test/i);
  });

  test("GET /api/v1/health returns healthy", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("unknown route returns a 404 JSON error", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test("notes route without a token returns 401", async () => {
    const res = await request(app).get("/api/v1/notes");
    expect(res.status).toBe(401);
  });
});
