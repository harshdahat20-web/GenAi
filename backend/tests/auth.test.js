const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const User = require("../src/models/User");
const { connectTestDB, clearDB, closeDB } = require("./helpers/db");
const { defaultUser, registerUser } = require("./helpers/auth");

const api = "/api/v1/auth";

beforeAll(connectTestDB);
beforeEach(clearDB); // empty database before EVERY test, so tests never affect each other
afterAll(closeDB);

describe("POST /auth/register", () => {
  test("creates a user and returns a token", async () => {
    const res = await request(app).post(`${api}/register`).send(defaultUser);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      name: defaultUser.name,
      email: defaultUser.email,
    });
    expect(res.body.user.password).toBeUndefined();
  });

  test("stores the password hashed, not as plain text", async () => {
    await registerUser();
    const saved = await User.findOne({ email: defaultUser.email }).select(
      "+password",
    );

    expect(saved.password).not.toBe(defaultUser.password);
    expect(saved.password).toMatch(/^\$2[aby]\$/); // bcrypt hash format
  });

  test("rejects a duplicate email with 409", async () => {
    await registerUser();
    const res = await request(app).post(`${api}/register`).send(defaultUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test("rejects a short password with 400", async () => {
    const res = await request(app)
      .post(`${api}/register`)
      .send({ ...defaultUser, password: "123" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/password/i);
  });

  test("rejects an invalid email with 400", async () => {
    const res = await request(app)
      .post(`${api}/register`)
      .send({ ...defaultUser, email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  test("rejects missing fields with 400", async () => {
    const res = await request(app).post(`${api}/register`).send({});
    expect(res.status).toBe(400);
  });

  test("ignores a role sent by the client (no self-made admins)", async () => {
    await request(app)
      .post(`${api}/register`)
      .send({ ...defaultUser, role: "admin" });
    const saved = await User.findOne({ email: defaultUser.email });

    expect(saved.role).toBe("user");
  });
});

describe("POST /auth/login", () => {
  beforeEach(() => registerUser());

  test("logs in with correct credentials", async () => {
    const res = await request(app)
      .post(`${api}/login`)
      .send({ email: defaultUser.email, password: defaultUser.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.password).toBeUndefined();
  });

  test("rejects a wrong password with 401", async () => {
    const res = await request(app)
      .post(`${api}/login`)
      .send({ email: defaultUser.email, password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  test("gives the SAME error for an unknown email (does not reveal who is registered)", async () => {
    const wrongPass = await request(app)
      .post(`${api}/login`)
      .send({ email: defaultUser.email, password: "wrongpassword" });
    const noUser = await request(app)
      .post(`${api}/login`)
      .send({ email: "nobody@example.com", password: "password123" });

    expect(noUser.status).toBe(401);
    expect(noUser.body.message).toBe(wrongPass.body.message);
  });

  test("rejects a missing password with 400", async () => {
    const res = await request(app)
      .post(`${api}/login`)
      .send({ email: defaultUser.email });
    expect(res.status).toBe(400);
  });
});

describe("GET /auth/me", () => {
  test("rejects a request with no token (401)", async () => {
    const res = await request(app).get(`${api}/me`);
    expect(res.status).toBe(401);
  });

  test("rejects a header that is not 'Bearer <token>' (401)", async () => {
    const { token } = await registerUser();
    const res = await request(app).get(`${api}/me`).set("Authorization", token); // missing "Bearer "
    expect(res.status).toBe(401);
  });

  test("rejects a garbage token (401)", async () => {
    const res = await request(app)
      .get(`${api}/me`)
      .set("Authorization", "Bearer abc123");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid or expired token");
  });

  test("returns the user for a valid token, without the password", async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .get(`${api}/me`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(defaultUser.email);
    expect(res.body.user.password).toBeUndefined();
  });

  test("rejects a valid token whose user was deleted (401)", async () => {
    const { token } = await registerUser();
    await User.deleteMany({});

    const res = await request(app)
      .get(`${api}/me`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("User no longer exists");
  });

  test("rejects a token signed with a different secret (401)", async () => {
    const { user } = await registerUser();
    const fake = jwt.sign(
      { id: user.id, role: "admin" },
      "some-other-secret-that-is-long-enough-123",
    );

    const res = await request(app)
      .get(`${api}/me`)
      .set("Authorization", `Bearer ${fake}`);
    expect(res.status).toBe(401);
  });

  test("rejects an expired token (401)", async () => {
    const { user } = await registerUser();
    const expired = jwt.sign(
      { id: user.id, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: -10 },
    );

    const res = await request(app)
      .get(`${api}/me`)
      .set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });
});
