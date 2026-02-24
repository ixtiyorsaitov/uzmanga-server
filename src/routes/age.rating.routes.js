const express = require("express");
const router = express.Router();

const ageRatingController = require("../controllers/age.rating.controller");

router.get("/", ageRatingController.getAllAgeRatings);
router.post("/", ageRatingController.createAgeRating);

module.exports = router;
