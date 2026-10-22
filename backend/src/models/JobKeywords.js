const mongoose = require("mongoose");

// The keywords the AI picked for one job description, so checking the same job again
// gives the same keywords (and the same score) without another AI call.
const jobKeywordsSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  hash: { type: String, required: true },
  keywords: { type: [String], default: [] },
  suggestions: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 }, // forgotten after 7 days
});

jobKeywordsSchema.index({ user: 1, hash: 1 }, { unique: true });

module.exports = mongoose.model("JobKeywords", jobKeywordsSchema);
