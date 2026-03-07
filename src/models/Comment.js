const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["Manga", "Chapter", "User"],
      required: true,
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },

    replyTo: {
      type: {
        commentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Comment",
          required: true,
        },
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        _id: false,
      },
      default: null,
    },
    isPinned: {
      type: Boolean,
      default: false,
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
      replies: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true },
);

commentSchema.post("save", async function (doc) {
  if (doc.parentId && doc.createdAt.getTime() === doc.updatedAt.getTime()) {
    await mongoose.model("Comment").findByIdAndUpdate(doc.parentId, {
      $inc: { "stats.replies": 1 },
    });
  }
  if (!doc.parentId) {
    if (doc.targetType === "Manga") {
      await mongoose.model("Manga").findByIdAndUpdate(doc.targetId, {
        $inc: { "stats.comments": 1 },
      });
    } else if (doc.targetType === "Chapter") {
      await mongoose.model("Chapter").findByIdAndUpdate(doc.targetId, {
        $inc: { "stats.comments": 1 },
      });
    }
  }
});

commentSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;

  if (doc.parentId) {
    const subRepliesCount = await mongoose.model("Comment").countDocuments({
      "replyTo.commentId": doc._id,
    });

    await mongoose.model("Comment").findByIdAndUpdate(doc.parentId, {
      $inc: { "stats.replies": -(1 + subRepliesCount) },
    });

    if (subRepliesCount > 0) {
      await mongoose
        .model("Comment")
        .deleteMany({ "replyTo.commentId": doc._id });
    }
  }

  if (!doc.parentId) {
    if (doc.targetType === "Manga") {
      await mongoose.model("Manga").findByIdAndUpdate(doc.targetId, {
        $inc: { "stats.comments": -1 },
      });
    } else if (doc.targetType === "Chapter") {
      await mongoose.model("Chapter").findByIdAndUpdate(doc.targetId, {
        $inc: { "stats.comments": -1 },
      });
    }

    await mongoose.model("Comment").deleteMany({ parentId: doc._id });
  }
});
commentSchema.index({ targetId: 1, targetType: 1, parentId: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);
