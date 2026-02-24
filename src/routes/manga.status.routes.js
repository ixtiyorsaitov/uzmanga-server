const express = require("express");
const router = express.Router();

const mangaStatusController = require("../controllers/manga.status.controller");

router.get("/", mangaStatusController.getAllMangaStatuses);
router.post("/", mangaStatusController.createMangaStatus);

module.exports = router;
