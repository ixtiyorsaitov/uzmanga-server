const ApiResponse = require("../utils/response");
const Comment = require("../models/Comment");
const Like = require("../models/Like");
const commentService = require("../services/comment.service");
const allowedTypes = ["Manga", "Chapter", "User"];

exports.createComment = async (req, res, next) => {
  try {
    const { targetId } = req.params;
    const { targetType } = req.query;
    const { content } = req.body;

    if (!content || !targetType) {
      return ApiResponse.error(res, "Ma'lumotlarni to'liq kiriting", 400);
    }
    if (!allowedTypes.includes(targetType)) {
      return ApiResponse.error(
        res,
        "Noto'g'ri targetType yuborildi (Manga, Chapter yoki User)",
        400,
      );
    }

    const reqUser = req.user._id;

    const comment = await Comment.create({
      author: reqUser,
      content,
      targetId,
      targetType,
    });

    const populatedComment = await comment.populate([
      { path: "author", select: "name avatar" },
      { path: "replyTo.user", select: "name" },
    ]);

    return ApiResponse.success(res, populatedComment, "Izoh yozildi", 201);
  } catch (error) {
    next(error);
  }
};

exports.createReplyComment = async (req, res, next) => {
  try {
    const { targetId } = req.params;
    const { targetType } = req.query;
    const { content, parentId, replyToCommentId } = req.body;

    if (!content || !targetType || !parentId) {
      return ApiResponse.error(res, "Ma'lumotlarni to'liq kiriting", 400);
    }
    if (!allowedTypes.includes(targetType)) {
      return ApiResponse.error(
        res,
        "Noto'g'ri targetType yuborildi (Manga, Chapter yoki User)",
        400,
      );
    }

    let replyToData = null;

    if (replyToCommentId) {
      const originalComment = await Comment.findOne({
        _id: replyToCommentId,
        targetId: targetId,
        targetType: targetType,
      }).select("author");

      if (!originalComment) {
        return ApiResponse.error(
          res,
          "Javob berilayotgan komment topilmadi",
          404,
        );
      }

      replyToData = {
        user: originalComment.author,
        commentId: replyToCommentId,
      };
    }

    const comment = await Comment.create({
      author: req.user._id,
      content,
      targetId,
      targetType,
      parentId: parentId || null,
      replyTo: replyToData,
    });

    const populatedComment = await comment.populate([
      { path: "author", select: "name avatar" },
      { path: "replyTo.user", select: "name" },
    ]);

    return ApiResponse.success(
      res,
      populatedComment,
      "Izohga javob yozildi",
      201,
    );
  } catch (error) {
    next(error);
  }
};

exports.getComments = async (req, res, next) => {
  try {
    const { targetId } = req.params;
    const { targetType, sortBy = "newest", page = 1, limit = 10 } = req.query;

    const userId = req.user ? req.user._id : null;

    if (!targetType) {
      return ApiResponse.error(res, "targetType yuborilishi shart", 400);
    }
    if (!allowedTypes.includes(targetType)) {
      return ApiResponse.error(res, "Noto'g'ri targetType", 400);
    }

    let sortQuery = { createdAt: -1 };
    if (sortBy === "popular") {
      sortQuery = { "stats.score": -1, createdAt: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const totalComments = await Comment.countDocuments({
      targetId,
      targetType,
      parentId: null,
    });

    const comments = await Comment.find({
      targetId,
      targetType,
      parentId: null,
    })
      .populate("author", "name avatar")
      .sort(sortQuery)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const commentsWithReactions = await commentService.attachUserReactions(
      comments,
      userId,
    );

    const hasNextPage = skip + comments.length < totalComments;

    return ApiResponse.success(
      res,
      {
        comments: commentsWithReactions,
        hasNextPage,
        nextPage: Number(page) + 1,
      },
      "Comments olish muvaffaqiyatli",
      200,
    );
  } catch (error) {
    next(error);
  }
};

exports.getRepliedComments = async (req, res, next) => {
  try {
    const { targetId, parentId } = req.params;
    const { targetType, page = 1, limit = 5 } = req.query;

    const userId = req.user ? req.user._id : null;

    if (!targetType) {
      return ApiResponse.error(
        res,
        "targetType yuborilishi shart (Manga, Chapter yoki User)",
        400,
      );
    }
    const allowedTypes = ["Manga", "Chapter", "User"];
    if (!allowedTypes.includes(targetType)) {
      return ApiResponse.error(res, "Noto'g'ri targetType yuborildi", 400);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const totalComments = await Comment.countDocuments({
      targetId,
      targetType,
      parentId,
    });

    const comments = await Comment.find({
      targetId,
      targetType,
      parentId,
    })
      .populate("author", "name avatar")
      .populate("replyTo.user", "name")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const commentsWithReactions = await commentService.attachUserReactions(
      comments,
      userId,
    );

    const hasNextPage = skip + comments.length < totalComments;

    return ApiResponse.success(
      res,
      {
        comments: commentsWithReactions,
        hasNextPage,
        nextPage: Number(page) + 1,
      },
      "Izohlar olindi",
      200,
    );
  } catch (error) {
    next(error);
  }
};

exports.updateComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    if (!content) {
      return ApiResponse.error(res, "Barcha maydonlarni to'ldiring!", 400);
    }
    const userId = req.user._id;
    const comment = await Comment.findById(commentId).lean();
    if (!comment) {
      return ApiResponse.error(res, "Izoh topilmadi", 404);
    }
    if (comment.author.toString() !== userId.toString()) {
      return ApiResponse.error(res, "Izoh egasi emassiz", 403);
    }

    const updated = await Comment.findByIdAndUpdate(
      commentId,
      { $set: { content: content } },
      { new: true },
    ).lean();

    return ApiResponse.success(res, updated, "Izoh tahrirlandi", 200);
  } catch (error) {
    next(error);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId).lean();

    if (!comment) {
      return ApiResponse.error(res, "Izoh topilmadi", 404);
    }

    if (comment.author.toString() !== userId.toString()) {
      return ApiResponse.error(res, "Izoh egasi emassiz", 403);
    }

    await Comment.findByIdAndDelete(commentId);

    return ApiResponse.success(res, null, "Izoh o'chirildi", 200);
  } catch (error) {
    next(error);
  }
};

exports.toggleReaction = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { value } = req.body; // 1 (Like) yoki -1 (Dislike)
    const userId = req.user._id;

    if (![1, -1].includes(value)) {
      return ApiResponse.error(res, "Noto'g'ri qiymat jo'natildi", 400);
    }

    const comment = await Comment.findById(commentId).lean();
    if (!comment) {
      return ApiResponse.error(res, "Izoh topilmadi", 404);
    }

    const existingReaction = await Like.findOne({
      user: userId,
      targetId: commentId,
      targetType: "Comment",
    });

    let updatedComment; // Yangilangan commentni saqlash uchun o'zgaruvchi

    if (existingReaction) {
      // 1-HOLAT: O'zi bosgan tugmani qayta bosib, bekor qilyapti (Toggle off)
      if (existingReaction.value === value) {
        await Like.findByIdAndDelete(existingReaction._id);

        updatedComment = await Comment.findByIdAndUpdate(
          commentId,
          { $inc: { "stats.score": -value } },
          { new: true }, // Yangilangan hujjatni qaytarishni so'raymiz
        );

        return ApiResponse.success(
          res,
          { score: updatedComment.stats.score, userReaction: null }, // Qaytarilayotgan data
          "Reaksiya olib tashlandi",
          200,
        );
      }

      // 2-HOLAT: Fikrini o'zgartirdi
      else {
        existingReaction.value = value;
        await existingReaction.save();

        const scoreChange = value === 1 ? 2 : -2;
        updatedComment = await Comment.findByIdAndUpdate(
          commentId,
          { $inc: { "stats.score": scoreChange } },
          { new: true },
        );

        return ApiResponse.success(
          res,
          { score: updatedComment.stats.score, userReaction: value },
          "Reaksiya o'zgartirildi",
          200,
        );
      }
    }

    // 3-HOLAT: Yangi reaksiya
    await Like.create({
      user: userId,
      targetId: commentId,
      targetType: "Comment",
      value: value,
    });

    updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { $inc: { "stats.score": value } },
      { new: true },
    );

    return ApiResponse.success(
      res,
      { score: updatedComment.stats.score, userReaction: value },
      "Reaksiya qabul qilindi",
      200,
    );
  } catch (error) {
    next(error);
  }
};
