const mongoose = require("mongoose");

const mangaSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Manga nomi bo'lishi shart"],
      trim: true,
    },
    description: String,
    coverImage: { type: String, default: "default-cover.jpg" },
    author: String,
    genres: [String],
    status: {
      type: String,
      enum: ["ongoing", "completed", "hiatus"],
      default: "ongoing",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Manga", mangaSchema);
