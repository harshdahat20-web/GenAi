const asyncHandler = require("../utils/asyncHandler");
const reviewService = require("../services/ai/review.service");

const review = asyncHandler(async (req, res) => {
  const result = await reviewService.reviewCode(req.user._id, req.body);
  res.json({ success: true, ...result });
});

module.exports = { review };
