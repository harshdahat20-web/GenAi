const request = require("supertest");
const app = require("../../src/app");

const defaultUser = {
  name: "Test User",
  email: "test@example.com",
  password: "password123",
};

const registerUser = async (overrides = {}) => {
  const body = { ...defaultUser, ...overrides };
  const res = await request(app).post("/api/v1/auth/register").send(body);
  return { res, token: res.body.token, user: res.body.user, body };
};

module.exports = { defaultUser, registerUser };
