const rateLimit = require("express-rate-limit");
const env = require("../config/env");

// Limits AI routes per logged-in user (falls back to IP)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // 20 AI calls per window
  keyGenerator: (req) => (req.user ? req.user._id.toString() : req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: "Too many AI requests. Please try again later.",
  },
  skip: () => env.NODE_ENV === "test",
});

// Stricter limit for login/register to slow down password guessing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again later.",
  },
  skip: () => env.NODE_ENV === "test",
});

module.exports = { aiLimiter, authLimiter };
