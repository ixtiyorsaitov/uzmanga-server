const mongoose = require("mongoose");
const { Schema } = mongoose;

const chapterSchema = new Schema(
  {
    manga: {
      type: Schema.Types.ObjectId,
      ref: "Manga",
      required: true,
    },
    title: { type: String },
    isLocked: { type: Boolean, default: false },
    price: {
      type: Number,
      default: 0,
    },
    volumeNumber: {
      type: Number,
      default: 1,
    },
    pages: [
      {
        type: Schema.Types.ObjectId,
        ref: "Media",
      },
    ],
    disableComments: {
      type: Boolean,
      default: false,
    },
    chapterNumber: {
      type: Number,
      required: [true, "Bob raqami shart"],
      min: [0, "Bob raqami manfiy bo'lishi mumkin emas"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Yaratuvchi shart"],
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    stats: {
      likes: {
        type: Number,
        default: 0,
      },
      dislikes: {
        type: Number,
        default: 0,
      },
      comments: {
        type: Number,
        default: 0,
      },
      views: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true },
);

chapterSchema.index({ manga: 1, chapterNumber: 1 }, { unique: true });

module.exports = mongoose.model("Chapter", chapterSchema);
