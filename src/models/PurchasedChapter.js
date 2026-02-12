const mongoose = require("mongoose");
const { Schema } = mongoose;

const purchasedChapterSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, 
    },
    manga: {
      type: Schema.Types.ObjectId,
      ref: "Manga",
      required: true,
    },
    chapter: {
      type: Schema.Types.ObjectId,
      ref: "Chapter",
      required: true,
    },
    unlockedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Bitta user bitta bobni ikki marta sotib olmasligi uchun
purchasedChapterSchema.index({ user: 1, chapter: 1 }, { unique: true });

module.exports = mongoose.model("PurchasedChapter", purchasedChapterSchema);
