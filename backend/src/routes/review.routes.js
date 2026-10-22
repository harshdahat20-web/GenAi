const express = require("express");
const router = express.Router();

const controller = require("../controllers/review.controller");
const { protect } = require("../middlewares/auth.middleware");
const { aiLimiter } = require("../middlewares/rateLimit.middleware");
const validate = require("../middlewares/validate.middleware");
const { reviewSchema } = require("../validators/review.validator");

// protect first (the limiter needs req.user), then limit, then check the input
router.post("/", protect, aiLimiter, validate(reviewSchema), controller.review);

module.exports = router;
