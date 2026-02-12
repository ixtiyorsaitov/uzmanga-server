const express = require("express");
const router = express.Router();

const { protect, restrictTo } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

// Get all chapters
router.get("/", (req, res) => {
  return res.json({ message: "Chapters" });
});

module.exports = router;
