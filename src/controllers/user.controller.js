const ReadingProgress = require("../models/ReadingProgress");
const ApiResponse = require("../utils/response");

exports.getUserReadingProgress = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Query parametrlarini olish (standart qiymatlar bilan)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 2. Ma'lumotlarni parallel ravishda olish (tezlik uchun)
    const [history, total] = await Promise.all([
      ReadingProgress.find({ user: userId })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "manga",
          select: "title slug images.cover status stats.chapters",
          populate: {
            path: "images.cover",
            select: "url",
          },
        })
        .populate({
          path: "lastReadChapter",
          select: "chapterNumber",
        })
        .lean(), // Obyekt ko'rinishida olish (yengilroq)

      ReadingProgress.countDocuments({ user: userId }), // Jami elementlar soni
    ]);

    // 3. Natijani qaytarish
    return ApiResponse.success(
      res,
      {
        history,
        pagination: {
          totalItems: total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          limit: limit,
        },
      },
      "O'qish tarixi muvaffaqiyatli olindi",
      200,
    );
  } catch (error) {
    next(error);
  }
};
