const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  text: { type: String, required: true, maxlength: 12000 },
  createdAt: { type: Date, default: Date.now },
});

const conversationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    title: { type: String, default: "New chat", trim: true, maxlength: 80 },

    mode: { type: String, enum: ["chat", "math"], default: "chat" },

    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true },
);

// the sidebar lists a user's chats, most recently active first
conversationSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
