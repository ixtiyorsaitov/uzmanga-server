const express = require("express");
const router = express.Router();
const asyncHandler = require("../middlewares/asyncHandler");
const authController = require("../controllers/auth.controller");

router.post("/google", authController.googleLogin);
router.get("/", asyncHandler(authController.googleCallback));

module.exports = router;
