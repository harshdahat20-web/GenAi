const express = require("express");
const router = express.Router();

const statsController = require("../controllers/stats.controller");
const { protect } = require("../middlewares/auth.middleware");

router.get("/", protect, statsController.getStats);

module.exports = router;
