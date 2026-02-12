const mongoose = require("mongoose");

const mangaTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Manga turi nomi bo'lishi shart"],
      trim: true,
      unique: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("MangaType", mangaTypeSchema);
