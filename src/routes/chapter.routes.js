const express = require("express");
const router = express.Router();

const { protect, restrictTo } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

const chapterController = require("../controllers/chapter.controller");

// Get chapter by id
router.get("/:id", chapterController.getChapterById);

module.exports = router;
