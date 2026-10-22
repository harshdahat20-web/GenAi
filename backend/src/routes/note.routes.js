const express = require("express");
const router = express.Router();

const noteController = require("../controllers/note.controller");
const { protect } = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  createNoteSchema,
  updateNoteSchema,
} = require("../validators/note.validator");
const studyController = require("../controllers/study.controller");

router.use(protect); // every note route requires login

router
  .route("/")
  .post(validate(createNoteSchema), noteController.createNote)
  .get(noteController.getNotes);

router.get("/tags", noteController.getTags);

router.get("/:id/flashcards", studyController.listFlashcards);
router.delete("/:id/flashcards", studyController.clearFlashcards);
router.get("/:id/quizzes", studyController.listQuizzes);

router
  .route("/:id")
  .get(noteController.getNote)
  .patch(validate(updateNoteSchema), noteController.updateNote)
  .delete(noteController.deleteNote);

module.exports = router;
