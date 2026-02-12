const mongoose = require("mongoose");

const mangaSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Manga nomi bo'lishi shart"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Manga tavsifi bo'lishi shart"],
      trim: true,
    },
    type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MangaType",
      required: [true, "Manga turi bo'lishi shart"],
    },
    slug: {
      type: String,
      required: [true, "Manga slagi bo'lishi shart"],
      unique: true,
    },
    ageRating: { type: String, enum: ["all", "16+", "18+"], default: "all" },
    releaseYear: {
      type: Number,
      required: [true, "Manga yili bo'lishi shart"],
    },
    status: {
      type: String,
      enum: ["ongoing", "completed", "hiatus"],
      default: "ongoing",
    },
    translationStatus: {
      type: String,
      enum: ["translating", "finished", "dropped"],
      default: "translating",
    },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    genres: [{ type: mongoose.Schema.Types.ObjectId, ref: "Genre" }],
    publishers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    images: {
      cover: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media",
      },
      banner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media",
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Manga", mangaSchema);
