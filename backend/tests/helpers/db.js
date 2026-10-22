const mongoose = require("mongoose");

const assertTestDb = () => {
  if (!/test/i.test(mongoose.connection.name)) {
    throw new Error(
      `Refusing to touch database "${mongoose.connection.name}" because it is not a test database`,
    );
  }
};

const connectTestDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  assertTestDb();
};

const clearDB = async () => {
  assertTestDb();
  for (const c of Object.values(mongoose.connection.collections)) {
    await c.deleteMany({});
  }
};

const closeDB = () => mongoose.connection.close();

module.exports = { connectTestDB, clearDB, closeDB };
