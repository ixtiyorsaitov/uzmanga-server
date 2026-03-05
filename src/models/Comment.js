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
      },
      default: null,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },

    likesCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

commentSchema.index({ targetId: 1, targetType: 1, parentId: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);
