const express = require("express");
const router = express.Router();
const chapterController = require("../controllers/chapter.controller");
const { protect, restrictTo } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

/**
 * @desc Senior approach: Use clear prefixing to avoid collisions
 * /api/v1/chapters/...
 */

// --- PUBLIC ROUTES ---

// Manga tegishli barcha boblarni olish
// Tavsiya: /manga/:mangaId/chapters ko'rinishida bo'lsa yanada yaxshi
router.get("/manga/:mangaId", chapterController.getChaptersByMangaId);

// Ma'lum bir bobni o'qish (ID orqali)
// Endi bu /manga/:mangaId bilan to'qnashmaydi, chunki boshlanishi "single"
router.get("/single/:chapterId", chapterController.getChapterById);

// --- PROTECTED ROUTES (Admin & Publisher) ---

// Middlewarelarni guruhlash (Kodni toza saqlash uchun)
const adminAuth = [protect, restrictTo("admin", "publisher")];

router.route("/:mangaId").post(
  // ...adminAuth, // Middlewarelarni bir joyda yoqing
  upload.fields([{ name: "pages", maxCount: 100 }]),
  chapterController.createChapter,
);

router.delete(
  "/:mangaId/:chapterId",
  // ...adminAuth,
  chapterController.deleteChapter,
);

module.exports = router;
