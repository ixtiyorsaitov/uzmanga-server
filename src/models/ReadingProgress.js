const mongoose = require("mongoose");

const readingProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    manga: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manga",
      required: true,
    },
    lastReadChapter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
      required: true,
    },
  },
  { timestamps: true },
);

readingProgressSchema.index({ user: 1, manga: 1 }, { unique: true });

module.exports = mongoose.model("ReadingProgress", readingProgressSchema);
