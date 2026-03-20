const express = require("express");
const router = express.Router();
const {
  submitTranslatorApplication,
  reviewTranslatorApplication,
  getMyApplications,
  getMyApplicationById,
  updateMyApplication,
  cancelMyApplication,
  getTranslators,
} = require("../controllers/application.controller");
const { protect, restrictTo } = require("../middlewares/auth.middleware");

router.get(
  "/translators",
  protect,
  restrictTo("moderator", "admin"),
  getTranslators,
);

router.get("/my-applications", protect, getMyApplications);
router.get("/my-applications/:id", protect, getMyApplicationById);
router.put("/my-applications/:id", protect, updateMyApplication);
router.delete("/my-applications/:id", protect, cancelMyApplication);
router.post("/submit/translator", protect, submitTranslatorApplication);
router.patch(
  "/translators/:id/review",
  protect,
  restrictTo("moderator", "admin"),
  reviewTranslatorApplication,
);

module.exports = router;
