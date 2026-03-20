const express = require("express");
const router = express.Router();
const {
  submitTranslatorApplication,
  reviewApplication,
  getMyApplications,
  getMyApplicationById,
  updateMyApplication,
  cancelMyApplication
} = require("../controllers/application.controller");
const { protect, restrictTo } = require("../middlewares/auth.middleware");

router.get("/my-applications", protect, getMyApplications);
router.get("/my-applications/:id", protect, getMyApplicationById);
router.put("/my-applications/:id", protect, updateMyApplication);
router.delete("/my-applications/:id", protect, cancelMyApplication);
router.post("/submit/translator", protect, submitTranslatorApplication);
router.patch(
  "/review/:id",
  protect,
  restrictTo("moderator", "admin"),
  reviewApplication,
);

module.exports = router;
