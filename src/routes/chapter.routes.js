const express = require("express");
const router = express.Router();
const chapterController = require("../controllers/chapter.controller");
const {
  protect,
  restrictTo,
  optionalProtect,
} = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

// --- PUBLIC ROUTES ---

router.get(
  "/manga/:mangaId",
  optionalProtect,
  chapterController.getChaptersByMangaId,
);

router.get(
  "/single/:chapterId",
  optionalProtect,
  chapterController.getChapterById,
);

// --- PROTECTED ROUTES (Admin & Publisher) ---

const adminAuth = [protect, restrictTo("admin", "publisher")];

router.post(
  "/:mangaId",
  protect,
  upload.fields([{ name: "pages", maxCount: 100 }]),
  chapterController.createChapter,
);
router.post("/react/:chapterId", protect, chapterController.toggleReaction);
router.get(
  "/react/:chapterId/check",
  optionalProtect,
  chapterController.checkIsUserReacted,
);

router.delete(
  "/:mangaId/:chapterId",
  // ...adminAuth,
  chapterController.deleteChapter,
);

module.exports = router;
