require("dotenv").config({ quiet: true });

// Same DNS workaround as server.js (needed for Atlas mongodb+srv links on some networks)
require("dns").setServers(["1.1.1.1", "8.8.8.8"]);

process.env.NODE_ENV = "test";

const testUri = process.env.MONGO_URI_TEST;
if (!testUri) {
  throw new Error(
    "Add MONGO_URI_TEST to .env (a SEPARATE database) before running tests",
  );
}

// Safety: the database name must contain "test", otherwise we refuse to run
const dbName = new URL(testUri).pathname.slice(1);
if (!/test/i.test(dbName)) {
  throw new Error(
    `MONGO_URI_TEST database name must contain "test" (got "${dbName}")`,
  );
}

process.env.MONGO_URI = testUri;

// Fake keys: tests never call the real AI
process.env.GEMINI_API_KEY = "test-key";
process.env.ANTHROPIC_API_KEY = "test-key";
process.env.JWT_SECRET = process.env.JWT_SECRET || "t".repeat(40);
