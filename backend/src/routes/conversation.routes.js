const express = require("express");
const router = express.Router();

const controller = require("../controllers/conversation.controller");
const { protect } = require("../middlewares/auth.middleware");
const { aiLimiter } = require("../middlewares/rateLimit.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  createSchema,
  updateSchema,
  messageSchema,
} = require("../validators/conversation.validator");

router.use(protect);

router
  .route("/")
  .get(controller.list)
  .post(validate(createSchema), controller.create);

router
  .route("/:id")
  .get(controller.get)
  .patch(validate(updateSchema), controller.update)
  .delete(controller.remove);

// only this route costs money, so only this one is rate limited
router.post(
  "/:id/messages",
  aiLimiter,
  validate(messageSchema),
  controller.sendMessage,
);

module.exports = router;
