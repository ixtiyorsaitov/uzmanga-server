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
    ageRating: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AgeRating",
    },
    releaseYear: {
      type: Number,
      required: [true, "Manga yili bo'lishi shart"],
    },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MangaStatus",
    },
    translationStatus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TranslationStatus",
    },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    genres: [{ type: mongoose.Schema.Types.ObjectId, ref: "Genre" }],
    translators: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
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
    stats: {
      comments: {
        type: Number,
        default: 0,
      },
      bookmarks: {
        type: Number,
        default: 0,
      },
      likes: {
        type: Number,
        default: 0,
      },
      views: {
        type: Number,
        default: 0,
      },
    },
    alternativeTitles: {
      en: { type: String, trim: true },
      ru: { type: String, trim: true },
      romaji: { type: String, trim: true },
      native: { type: String, trim: true },
    },
    seo: {
      metaTitle: {
        type: String,
        maxLength: [60, "Meta title 60 ta belgidan oshmasligi kerak"],
      },
      metaDescription: {
        type: String,
        maxLength: [160, "Meta description 160 ta belgidan oshmasligi kerak"],
      },
      focusKeywords: [{ type: String }], // Qidiruv uchun asosiy kalit so'zlar
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Manga", mangaSchema);
