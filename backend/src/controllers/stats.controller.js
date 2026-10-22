const asyncHandler = require("../utils/asyncHandler");
const statsService = require("../services/stats.service");

const getStats = asyncHandler(async (req, res) => {
  const stats = await statsService.getStats(req.user._id);
  res.json({ success: true, stats });
});

module.exports = { getStats };
