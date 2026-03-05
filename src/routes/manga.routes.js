const express = require("express");
const router = express.Router();

const { protect, restrictTo } = require("../middlewares/auth.middleware");
const mangaController = require("../controllers/manga.controller");
const chapterController = require("../controllers/chapter.controller"); // Ajratilgan controller
const upload = require("../middlewares/upload.middleware");

// --- PUBLIC ROUTES ---
router.get("/", mangaController.getAllMangas);
router.get("/type", mangaController.getAllMangaTypes);
router.get("/:id", mangaController.getManga);

// --- PROTECTED ROUTES (Admin & Publisher) ---

// Manga turi
router.post("/type", mangaController.createMangaType);

// Manga boshqaruvi
router.post(
  "/",
  protect,
  // restrictTo("admin"),
  upload.fields([
    { name: "cover", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  mangaController.createManga,
);

router.put(
  "/:id",
  upload.fields([
    { name: "cover", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  mangaController.updateManga,
);

router.delete("/:id", mangaController.deleteManga);

module.exports = router;
