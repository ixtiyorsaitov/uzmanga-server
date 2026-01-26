const express = require("express");
const router = express.Router();

router.post("/register", (req, res) => {
  res.json({ success: true, message: "Register success" });
});

router.post("/login", (req, res) => {
  res.status(201).json({ success: true, message: "Login success" });
});

module.exports = router;
