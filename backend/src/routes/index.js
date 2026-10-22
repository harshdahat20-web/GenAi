const express = require("express");
const router = express.Router();

router.use("/health", require("./health.routes"));
router.use("/auth", require("./auth.route"));
router.use("/notes", require("./note.routes"));
router.use("/ai", require("./ai.routes"));
router.use("/stats", require("./stats.routes"));
router.use("/chats", require("./conversation.routes"));
router.use("/review", require("./review.routes"));
router.use("/resumes", require("./resume.routes"));

module.exports = router;
