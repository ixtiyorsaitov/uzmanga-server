const mongoose = require("mongoose");
const { BOOKMARK_STATUS } = require("../constants/bookmark.js");

const bookmarkSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: Object.values(BOOKMARK_STATUS),
      default: BOOKMARK_STATUS.PLAN_TO_READ,
    },
  },
  {
    timestamps: true,
  },
);

bookmarkSchema.index({ user: 1, manga: 1 }, { unique: true });

bookmarkSchema.pre("save", function () {
  this.wasNew = this.isNew;
});

bookmarkSchema.post("save", async function (doc) {
  if (this.wasNew) {
    await mongoose.model("Manga").findByIdAndUpdate(doc.manga, {
      $inc: { "stats.bookmarks": 1 },
    });
  }
});
bookmarkSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await mongoose.model("Manga").findByIdAndUpdate(doc.manga, {
      $inc: { "stats.bookmarks": -1 },
    });
  }
});

const Bookmark =
  mongoose.models.Bookmark || mongoose.model("Bookmark", bookmarkSchema);

module.exports = Bookmark;
