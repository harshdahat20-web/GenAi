const env = require("./src/config/env"); // loads dotenv and validates, must be first
const logger = require("./src/config/logger");

// Workaround for Atlas SRV DNS errors on some home networks. Not needed on the hosting server.
if (env.NODE_ENV !== "production")
  require("dns").setServers(["1.1.1.1", "8.8.8.8"]);

const app = require("./src/app");
const connectDB = require("./src/config/db");

connectDB();

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});
