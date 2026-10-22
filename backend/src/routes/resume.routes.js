const express = require("express");
const router = express.Router();

const controller = require("../controllers/resume.controller");
const aiController = require("../controllers/resumeAi.controller");
const { protect } = require("../middlewares/auth.middleware");
const { aiLimiter } = require("../middlewares/rateLimit.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  createSchema,
  updateSchema,
} = require("../validators/resume.validator");
const {
  improveSchema,
  summarySchema,
  matchSchema,
} = require("../validators/resumeAi.validator");

router.use(protect);

router
  .route("/")
  .get(controller.list)
  .post(validate(createSchema), controller.create);

// AI routes: these cost money, so they are rate limited
router.post(
  "/improve",
  aiLimiter,
  validate(improveSchema),
  aiController.improve,
);
router.post(
  "/:id/summary",
  aiLimiter,
  validate(summarySchema),
  aiController.summary,
);
router.post("/:id/match", aiLimiter, validate(matchSchema), aiController.match);

router
  .route("/:id")
  .get(controller.get)
  .patch(validate(updateSchema), controller.update)
  .delete(controller.remove);

router.post("/:id/duplicate", controller.duplicate);

module.exports = router;
