const mongoose = require("mongoose");

const mangaStatusSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Manga status nomi bo'lishi shart"],
      trim: true,
      unique: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("MangaStatus", mangaStatusSchema);
