const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    content: { type: String, required: true, maxlength: 20000 },
    summary: { type: String, default: "" },
    tags: [{ type: String, trim: true, lowercase: true }],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Note", noteSchema);
