const mongoose = require("mongoose");

const translationStatusSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Translation status name is required"],
      trim: true,
      unique: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("TranslationStatus", translationStatusSchema);
