const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },

    path: {
      type: String,
      required: true,
    },

    bucket: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["COVER", "BANNER", "CHAPTER", "SLIDER"],
      required: true,
    },

    refModel: {
      type: String,
      enum: ["Manga", "Chapter", "Slider"],
    },

    refId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Media", mediaSchema);
