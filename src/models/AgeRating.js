const mongoose = require("mongoose");

const ageRatingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Age rating name is required"],
      trim: true,
      unique: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AgeRating", ageRatingSchema);
