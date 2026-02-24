const express = require("express");
const router = express.Router();

const translationStatusController = require("../controllers/translation.status.controller");

router.get("/", translationStatusController.getAllTranslationStatuses);
router.post("/", translationStatusController.createTranslationStatus);

module.exports = router;