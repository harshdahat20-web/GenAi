const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const env = require("./config/env");

const routes = require("./routes");
const notFound = require("./middlewares/notFound.middleware");
const errorHandler = require("./middlewares/error.middleware");

const app = express();
app.set("trust proxy", 1);

app.use(helmet());

// CLIENT_URL can hold several addresses separated by commas (for example the Vercel link and your own domain)
const allowedOrigins = env.CLIENT_URL.split(",")
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins }));

app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  if (req.body === undefined) req.body = {}; // Express 5 leaves it undefined when no body is sent
  next();
});
if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
}

app.use("/api/v1", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
