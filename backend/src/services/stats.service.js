const Note = require("../models/Note");
const Flashcard = require("../models/Flashcard");
const Quiz = require("../models/Quiz");
const UsageLog = require("../models/UsageLog");
const noteService = require("./note.service");

const TZ = "Asia/Kolkata"; // change to your timezone so "per day" matches your local day
const DAY = 24 * 60 * 60 * 1000;

const lastDays = (n) =>
  Array.from({ length: n }, (_, i) =>
    new Date(Date.now() - (n - 1 - i) * DAY).toLocaleDateString("en-CA", {
      timeZone: TZ,
    }),
  ); // "en-CA" gives YYYY-MM-DD

const getStats = async (userId) => {
  const since = new Date(Date.now() - 8 * DAY);

  const [notes, flashcards, quizzes, byFeature, perDay, tags] =
    await Promise.all([
      Note.countDocuments({ user: userId }),
      Flashcard.countDocuments({ user: userId }),
      Quiz.countDocuments({ user: userId }),
      UsageLog.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: "$feature",
            requests: { $sum: 1 },
            inputTokens: { $sum: "$inputTokens" },
            outputTokens: { $sum: "$outputTokens" },
          },
        },
      ]),
      UsageLog.aggregate([
        { $match: { user: userId, createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: TZ,
              },
            },
            requests: { $sum: 1 },
          },
        },
      ]),
      noteService.getTags(userId),
    ]);

  const perDayMap = Object.fromEntries(perDay.map((d) => [d._id, d.requests]));

  return {
    totals: { notes, flashcards, quizzes },
    byFeature: byFeature.map(({ _id, ...rest }) => ({ feature: _id, ...rest })),
    last7Days: lastDays(7).map((date) => ({
      date,
      requests: perDayMap[date] || 0,
    })),
    topTags: tags.slice(0, 5),
  };
};

module.exports = { getStats };
