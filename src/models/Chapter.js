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
        media: {
          type: Schema.Types.ObjectId,
          ref: "Media",
          required: true,
        },
        pageNumber: {
          type: Number,
          required: true,
        },
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
      score: {
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
      uniqueViews: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true },
);

chapterSchema.index({ manga: 1, chapterNumber: 1 }, { unique: true });

chapterSchema.post("save", async function (doc) {
  // Agar hujjat yangi yaratilgan bo'lsa (createdAt va updatedAt bir xil bo'lsa)
  if (
    doc.createdAt &&
    doc.updatedAt &&
    doc.createdAt.getTime() === doc.updatedAt.getTime()
  ) {
    try {
      await mongoose.model("Manga").findByIdAndUpdate(doc.manga, {
        $inc: { "stats.chapters": 1 },
      });
    } catch (error) {
      console.error(
        `Manga (${doc.manga}) chapterlar sonini oshirishda xatolik:`,
        error,
      );
    }
  }
});

chapterSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;

  const chapterId = doc._id;

  try {
    await mongoose.model("UniqueViewHistory").deleteMany({
      targetId: chapterId,
      targetModel: "Chapter",
    });
    await mongoose.model("ViewLog").deleteMany({
      targetId: chapterId,
      targetModel: "Chapter",
    });
    await mongoose.model("Like").deleteMany({
      targetId: chapterId,
      targetType: "Chapter",
    });
    const comments = await mongoose
      .model("Comment")
      .find({ targetId: chapterId, targetType: "Chapter" })
      .select("_id");

    if (comments.length > 0) {
      const commentIds = comments.map((c) => c._id);

      await mongoose.model("Like").deleteMany({
        targetType: "Comment",
        targetId: { $in: commentIds },
      });
      await mongoose.model("Comment").deleteMany({
        targetId: chapterId,
        targetType: "Chapter",
      });
    }

    await mongoose.model("Manga").findByIdAndUpdate(doc.manga, {
      $inc: { "stats.chapters": -1 },
    });
  } catch (error) {
    console.error(
      `Chapter ${chapterId} ni o'chirishda xatolik yuz berdi:`,
      error,
    );
  }
});

module.exports = mongoose.model("Chapter", chapterSchema);
