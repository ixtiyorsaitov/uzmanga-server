exports.getUserReadingHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    // updatedAt: -1 bilan eng oxirgi o'qilgan mangalar birinchi chiqadi
    const history = await ReadingProgress.find({ user: userId })
      .sort({ updatedAt: -1 })
      .populate({
        path: "manga",
        select: "title slug images.cover status", // Front-end karta yasashi uchun kerakli narsalar
      })
      .populate({
        path: "lastReadChapter",
        select: "chapterNumber title slug", // Qaysi qismida qolgani
      });

    ApiResponse.success(
      res,
      { count: history.length, history },
      "History",
      200,
    );
  } catch (error) {
    next(error);
  }
};
