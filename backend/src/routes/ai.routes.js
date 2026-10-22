const express = require("express");
const router = express.Router();

const aiController = require("../controllers/ai.controller");
const { aiLimiter } = require("../middlewares/rateLimit.middleware");
const { protect } = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const { chatSchema } = require("../validators/ai.validator");

router.use(protect);
router.use(aiLimiter);

router.post("/notes/:noteId/summarize", aiController.summarize);
router.post("/notes/:noteId/flashcards", aiController.generateFlashcards);
router.post("/notes/:noteId/quiz", aiController.generateQuiz);
router.get("/usage", aiController.getUsage);
router.post("/notes/:noteId/chat", validate(chatSchema), aiController.chat);

module.exports = router;
