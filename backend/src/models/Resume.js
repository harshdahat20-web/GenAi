const mongoose = require("mongoose");
const { Schema } = mongoose;

const text = (max) => ({
  type: String,
  trim: true,
  maxlength: max,
  default: "",
});
const bullets = {
  type: [{ type: String, trim: true, maxlength: 300 }],
  default: [],
};

const experienceSchema = new Schema({
  company: text(80),
  role: text(80),
  location: text(80),
  start: text(20),
  end: text(20),
  current: { type: Boolean, default: false },
  bullets,
});

const educationSchema = new Schema({
  school: text(100),
  degree: text(100),
  location: text(80),
  start: text(20),
  end: text(20),
  details: text(300),
});

const projectSchema = new Schema({
  name: text(80),
  link: text(200),
  description: text(300),
  bullets,
});

const resumeSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { ...text(80), default: "My resume" },
    template: { type: String, enum: ["classic", "modern"], default: "classic" },
    personal: {
      name: text(80),
      email: text(120),
      phone: text(30),
      location: text(80),
      links: {
        type: [{ type: String, trim: true, maxlength: 200 }],
        default: [],
      },
      summary: text(600),
    },
    experience: { type: [experienceSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    projects: { type: [projectSchema], default: [] },
    skills: {
      type: [{ type: String, trim: true, maxlength: 40 }],
      default: [],
    },
  },
  { timestamps: true },
);

// the resume list shows a user's resumes, most recently edited first
resumeSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model("Resume", resumeSchema);
