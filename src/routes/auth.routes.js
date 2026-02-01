// routes/auth.routes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { protect } = require("../middlewares/auth.middleware");

router.post("/google", authController.googleLogin);
router.get("/", authController.googleCallback);
router.get("/me", protect, authController.getMe);
router.post("/refresh", authController.refreshToken);
router.post("/logout", protect, authController.logout);

module.exports = router;
