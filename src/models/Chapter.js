const mongoose = require("mongoose");

const chapterSchema = new mongoose.Schema(
  {
    manga: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manga",
      required: true,
    },
    title: String,
    chapterNumber: { type: Number, required: true },
    images: [String],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Chapter", chapterSchema);
