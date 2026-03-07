const ApiResponse = require("../utils/response");
const Comment = require("../models/Comment");
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

exports.getComments = async (req, res) => {
  try {
    const { targetId } = req.params;
    const { targetType } = req.query;

    if (!targetType) {
      return ApiResponse.error(
        res,
        "targetType yuborilishi shart (Manga, Chapter yoki User)",
        400,
      );
    }
    if (!allowedTypes.includes(targetType)) {
      return ApiResponse.error(
        res,
        "Noto'g'ri targetType yuborildi (Manga, Chapter yoki User)",
        400,
      );
    }

    const comments = await Comment.find({
      targetId,
      targetType,
      parentId: null,
    })
      .populate("author", "name avatar")
      .sort({ createdAt: -1 })
      .lean();

    return ApiResponse.success(
      res,
      comments,
      "Comments olish muvaffaqiyatli",
      200,
    );
  } catch (error) {
    next(error);
  }
};

exports.getRepliedComments = async (req, res) => {
  try {
    const { targetId, parentId } = req.params;
    const { targetType } = req.query;

    if (!targetType) {
      return ApiResponse.error(
        res,
        "targetType yuborilishi shart (Manga, Chapter yoki User)",
        400,
      );
    }
    const allowedTypes = ["Manga", "Chapter", "User"];
    if (!allowedTypes.includes(targetType)) {
      return ApiResponse.error(
        res,
        "Noto'g'ri targetType yuborildi (Manga, Chapter yoki User)",
        400,
      );
    }

    const comments = await Comment.find({
      targetId,
      targetType,
      parentId,
    })
      .populate("author", "name avatar")
      .populate("replyTo.user", "name")
      .sort({ createdAt: 1 })
      .lean();

    return ApiResponse.success(res, comments, "Izohlar olindi", 200);
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
