const pino = require("pino");
const env = require("./env");

const isProd = env.NODE_ENV === "production";
const isTest = env.NODE_ENV === "test";

const logger = pino({
  level: isTest ? "silent" : isProd ? "info" : "debug",
  ...(!isProd &&
    !isTest && {
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
      },
    }),
});

module.exports = logger;
