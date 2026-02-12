const express = require("express");
const router = express.Router();

const { protect, restrictTo } = require("../middlewares/auth.middleware");
const mangaController = require("../controllers/manga.controller");
const upload = require("../middlewares/upload.middleware");

// Get all mangas
router.get("/", mangaController.getAllMangas);

// Get all manga types
router.get("/type", mangaController.getAllMangaTypes);

// Get manga by id
router.get("/:id", mangaController.getMangaById);

// Get manga chapters
router.get("/:id/chapters", mangaController.getMangaChapters);

// Get chapter by id
router.get("/:id/chapters/:chapterId", mangaController.getChapterById);

// Create manga type
router.post("/type", mangaController.createMangaType);
// Create manga
router.post(
  "/",
  //   protect,
  //   restrictTo("admin", "publisher"),
  upload.fields([
    { name: "cover", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  mangaController.createManga,
);

// Create chapter
router.post(
  "/:id/chapters",
  upload.fields([{ name: "pages", maxCount: 100 }]),
  mangaController.createChapter,
);

// Update manga
router.put(
  "/:id",
  //   protect,
  //   restrictTo("admin", "publisher"),
  upload.fields([
    { name: "cover", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  mangaController.updateManga,
);

// Delete manga
router.delete("/:id", mangaController.deleteManga);

// Delete chapter
router.delete(
  "/:id/chapters/:chapterId",
  //   protect,
  //   restrictTo("admin", "publisher"),
  mangaController.deleteChapter,
);

module.exports = router;
