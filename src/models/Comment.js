const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "targetType",
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
      score: {
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

  // 1. O'chirilishi kerak bo'lgan barcha comment ID larini bitta massivga yig'amiz.
  // Boshida ro'yxatda faqat hozir o'chirilayotgan commentning o'zi bor.
  const commentIdsToDelete = [doc._id];

  // A HOLAT: Agar bu Reply (Javob) comment bo'lsa
  if (doc.parentId) {
    // Agar bu reply'ga ham kimdir sub-reply yozgan bo'lsa, ularni ID larini topamiz
    const subReplies = await mongoose
      .model("Comment")
      .find({ "replyTo.commentId": doc._id })
      .select("_id");
    const subReplyIds = subReplies.map((reply) => reply._id);

    // Ularni ham o'chiriladiganlar ro'yxatiga qo'shamiz
    commentIdsToDelete.push(...subReplyIds);

    // Ota commentning 'replies' sanoqlarini to'g'rilaymiz
    await mongoose.model("Comment").findByIdAndUpdate(doc.parentId, {
      $inc: { "stats.replies": -(1 + subReplyIds.length) },
    });

    // Sub-reply larni Comment bazasidan o'chiramiz
    if (subReplyIds.length > 0) {
      await mongoose.model("Comment").deleteMany({ _id: { $in: subReplyIds } });
    }
  }

  // B HOLAT: Agar bu Asosiy (Root) comment bo'lsa
  if (!doc.parentId) {
    // Barcha javoblarning ID larini topamiz
    const childComments = await mongoose
      .model("Comment")
      .find({ parentId: doc._id })
      .select("_id");
    const childIds = childComments.map((child) => child._id);

    // Javoblarning ID larini ham ro'yxatga qo'shamiz
    commentIdsToDelete.push(...childIds);

    // Manga yoki Chapter sanoqlarini kamaytiramiz
    if (doc.targetType === "Manga") {
      await mongoose.model("Manga").findByIdAndUpdate(doc.targetId, {
        $inc: { "stats.comments": -1 },
      });
    } else if (doc.targetType === "Chapter") {
      await mongoose.model("Chapter").findByIdAndUpdate(doc.targetId, {
        $inc: { "stats.comments": -1 },
      });
    }

    // Barcha javoblarni Comment bazasidan o'chiramiz
    if (childIds.length > 0) {
      await mongoose.model("Comment").deleteMany({ _id: { $in: childIds } });
    }
  }

  // 2. ENG ASOSIY QISM: Yig'ilgan BARCHA ID larga (ham ota, ham bolalar) tegishli Likelarni BITTADA o'chiramiz
  if (commentIdsToDelete.length > 0) {
    await mongoose.model("Like").deleteMany({
      targetType: "Comment",
      targetId: { $in: commentIdsToDelete },
    });
  }
});
commentSchema.index({ targetId: 1, targetType: 1, parentId: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);
