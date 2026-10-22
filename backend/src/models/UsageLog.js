const mongoose = require("mongoose");

const FEATURES = [
  "summarize",
  "flashcards",
  "quiz",
  "chat",
  "assistant",
  "resume",
  "cover_letter",
  "interview",
  "planner",
  "pdf",
  "code_review",
];

const usageLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    feature: { type: String, enum: FEATURES, required: true },
    model: { type: String, required: true },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("UsageLog", usageLogSchema);
