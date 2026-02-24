const express = require("express");
const router = express.Router();

const mangaTypesController = require("../controllers/manga.types.controller");

router.get("/", mangaTypesController.getAllMangaTypes);
router.post("/", mangaTypesController.createMangaType);

module.exports = router;