const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/ai/resumeAi.service");

const improve = asyncHandler(async (req, res) => {
  const result = await service.improveBullets(req.user._id, req.body);
  res.json({ success: true, ...result });
});

const summary = asyncHandler(async (req, res) => {
  const result = await service.writeSummary(
    req.user._id,
    req.params.id,
    req.body.targetRole,
  );
  res.json({ success: true, ...result });
});

const match = asyncHandler(async (req, res) => {
  const result = await service.matchJob(
    req.user._id,
    req.params.id,
    req.body.jobDescription,
  );
  res.json({ success: true, ...result });
});

module.exports = { improve, summary, match };
