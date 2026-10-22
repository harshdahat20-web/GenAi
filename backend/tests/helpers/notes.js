const request = require("supertest");
const app = require("../../src/app");

const sampleNote = {
  title: "Photosynthesis",
  content: "Plants make food using sunlight",
  tags: ["biology"],
};

// Create a note as the user who owns this token
const createNote = (token, overrides = {}) =>
  request(app)
    .post("/api/v1/notes")
    .set("Authorization", `Bearer ${token}`)
    .send({ ...sampleNote, ...overrides });

// Shortcut: authed("get", "/api/v1/notes", token)
const authed = (method, url, token) =>
  request(app)[method](url).set("Authorization", `Bearer ${token}`);

module.exports = { sampleNote, createNote, authed };
