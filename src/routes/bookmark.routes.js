const express = require("express");
const controller = require("../controllers/bookmark.controller.js");
const {
  protect,
  optionalProtect,
} = require("../middlewares/auth.middleware.js");

const router = express.Router();
router.get("/:mangaId/check", optionalProtect, controller.checkIsBookmarked);
router.post("/:mangaId/toggle", protect, controller.toggleBookmark);
router.delete("/:mangaId", protect, controller.deleteBookmark);

module.exports = router;
