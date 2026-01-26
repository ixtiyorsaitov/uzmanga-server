const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ success: true, message: "Mangalar olindi" });
});

router.post("/", (req, res) => {
  res.status(201).json({ success: true, message: "Manga yaratildi" });
});

router.get("/:id", (req, res) => {
  res.json({ success: true, message: "Bitta manga" });
});

module.exports = router;
