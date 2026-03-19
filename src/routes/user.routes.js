const express = require("express");
const { protect, optionalProtect } = require("../middlewares/auth.middleware");
const userController = require("../controllers/user.controller");

const router = express.Router();

router.get(
  "/user/reading-progress",
  protect,
  userController.getUserReadingProgress,
);

module.exports = router;
