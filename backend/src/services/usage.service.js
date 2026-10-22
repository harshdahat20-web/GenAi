const UsageLog = require("../models/UsageLog");
const env = require("../config/env");
const logger = require("../config/logger");

const logUsage = async (userId, feature, usage) => {
  try {
    await UsageLog.create({
      user: userId,
      feature,
      model: env.AI_MODEL,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    });
  } catch (err) {
    // Logging must never break the user's request
    logger.error({ err }, "Failed to save usage log");
  }
};

const getUserUsage = async (userId) => {
  const [totals] = await UsageLog.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: null,
        requests: { $sum: 1 },
        inputTokens: { $sum: "$inputTokens" },
        outputTokens: { $sum: "$outputTokens" },
      },
    },
  ]);
  return totals
    ? {
        requests: totals.requests,
        inputTokens: totals.inputTokens,
        outputTokens: totals.outputTokens,
      }
    : { requests: 0, inputTokens: 0, outputTokens: 0 };
};

module.exports = { logUsage, getUserUsage };
