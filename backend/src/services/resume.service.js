const mongoose = require("mongoose");
const Resume = require("../models/Resume");
const ApiError = require("../utils/ApiError");

const MAX_RESUMES = 10;

const assertValidId = (id) => {
  if (!mongoose.isValidObjectId(id))
    throw new ApiError(400, "Invalid resume id");
};

// Every query includes the owner, so nobody can open another user's resume
const findOwned = async (userId, id) => {
  assertValidId(id);
  const resume = await Resume.findOne({ _id: id, user: userId });
  if (!resume) throw new ApiError(404, "Resume not found");
  return resume;
};

const assertRoom = async (userId) => {
  if ((await Resume.countDocuments({ user: userId })) >= MAX_RESUMES) {
    throw new ApiError(
      400,
      `You can have up to ${MAX_RESUMES} resumes. Delete one to make room.`,
    );
  }
};

// "personal" is merged field by field, every other section is replaced as a whole
const toSet = (data) =>
  Object.entries(data).reduce((set, [key, value]) => {
    if (key === "personal")
      Object.entries(value).forEach(([k, v]) => {
        set[`personal.${k}`] = v;
      });
    else set[key] = value;
    return set;
  }, {});

const list = (userId) =>
  Resume.find({ user: userId })
    .select("title template createdAt updatedAt")
    .sort({ updatedAt: -1 })
    .limit(50);

const create = async (userId, data) => {
  await assertRoom(userId);
  return Resume.create({ ...data, user: userId });
};

const get = (userId, id) => findOwned(userId, id);

const update = async (userId, id, data) => {
  const set = toSet(data);
  if (Object.keys(set).length === 0) return findOwned(userId, id); // nothing to change
  assertValidId(id);
  const resume = await Resume.findOneAndUpdate(
    { _id: id, user: userId },
    { $set: set },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );
  if (!resume) throw new ApiError(404, "Resume not found");
  return resume;
};

const remove = async (userId, id) => {
  assertValidId(id);
  const resume = await Resume.findOneAndDelete({ _id: id, user: userId });
  if (!resume) throw new ApiError(404, "Resume not found");
};

// Handy for making a version of your resume for one specific job
const duplicate = async (userId, id) => {
  const original = await findOwned(userId, id);
  await assertRoom(userId);
  const { _id, user, createdAt, updatedAt, __v, ...rest } = original.toObject();
  return Resume.create({
    ...rest,
    user: userId,
    title: `${original.title} (copy)`.slice(0, 80),
  });
};

module.exports = { list, create, get, update, remove, duplicate, MAX_RESUMES };
