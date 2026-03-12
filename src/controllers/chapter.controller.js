const Manga = require("../models/Manga");
const Chapter = require("../models/Chapter");
const Like = require("../models/Like");
const chapterService = require("../services/chapter.service");
const ApiResponse = require("../utils/response");

exports.getChaptersByMangaId = async (req, res, next) => {
  try {
    const { mangaId } = req.params;

    let { page = 1, limit = 10, search = "", ordering = "-index" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const userId = req.user ? req.user._id : null;

    const query = { manga: mangaId };

    if (search) {
      const searchNumber = parseFloat(search);

      query.$or = [{ title: { $regex: search, $options: "i" } }];

      if (!isNaN(searchNumber)) {
        query.$or.push({ chapterNumber: searchNumber });
      }
    }

    let sortQuery;
    if (ordering === "index") {
      sortQuery = { volumeNumber: 1, chapterNumber: 1 };
    } else if (ordering === "-index") {
      sortQuery = { volumeNumber: -1, chapterNumber: -1 };
    } else {
      sortQuery = ordering;
    }

    const chapters = await Chapter.find(query)
      .select("-disableComments -createdAt -updatedAt -manga -pages -__v")
      .populate("createdBy", "name")
      .sort(sortQuery)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const chaptersWithLikes = await chapterService.attachUserLikesToChapters(
      chapters,
      userId,
    );

    const totalChapters = await Chapter.countDocuments(query);

    return ApiResponse.success(
      res,
      {
        chapters: chaptersWithLikes,
        pagination: {
          total: totalChapters,
          page,
          limit,
          totalPages: Math.ceil(totalChapters / limit),
        },
      },
      "Boblar muvaffaqiyatli olindi",
      200,
    );
  } catch (error) {
    next(error);
  }
};

exports.getChapterById = async (req, res, next) => {
  try {
    const { chapterId } = req.params;

    const chapter = await Chapter.findById(chapterId)
      .populate("pages.media", "url")
      .populate("manga", "title slug")
      .lean();

    if (!chapter) return ApiResponse.error(res, "Bob topilmadi", 404);

    let isLiked = false;

    if (req.user && req.user._id) {
      const reaction = await Like.findOne({
        targetId: chapterId,
        targetType: "Chapter",
        user: req.user._id,
      }).lean();

      if (reaction) {
        isLiked = true;
      }
    }

    chapter.isLiked = isLiked;

    return ApiResponse.success(res, chapter, "Bob topildi", 200);
  } catch (error) {
    next(error);
  }
};

exports.createChapter = async (req, res, next) => {
  try {
    const { mangaId } = req.params;
    const {
      title,
      chapterNumber,
      volumeNumber,
      isLocked,
      price,
      disableComments,
    } = req.body;
    const requestUser = req.user._id;

    if (!chapterNumber) return ApiResponse.error(res, "Bob raqami shart", 400);

    const manga = await Manga.findById(mangaId)
      .select("createdBy translators")
      .lean();

    if (!manga) return ApiResponse.error(res, "Manga topilmadi", 404);

    if (
      manga.createdBy.toString() !== requestUser.toString() &&
      !manga.translators.includes(requestUser.toString())
    ) {
      return ApiResponse.error(res, "Ruxsat yo'q", 403);
    }

    const existChapter = await Chapter.findOne({ chapterNumber }).lean();
    if (existChapter) {
      return ApiResponse.error(res, "Ushbu raqamli bob allaqachon mavjud", 400);
    }

    if (!req.files || !req.files.pages || !req.files.pages.length) {
      return ApiResponse.error(res, "Bob sahifalari yuklanishi shart", 400);
    }

    const pagesData = await chapterService.uploadChapterPages(
      mangaId,
      chapterNumber,
      req.files.pages,
    );

    const chapter = await Chapter.create({
      manga: mangaId,
      title,
      chapterNumber: parseFloat(chapterNumber),
      volumeNumber: volumeNumber ? parseInt(volumeNumber) : 1,
      isLocked: isLocked === "true",
      price: price ? parseInt(price) : 0,
      disableComments: disableComments === "true",
      pages: pagesData,
      createdBy: requestUser,
    });

    const mediaIdsOnly = pagesData.map((page) => page.media);
    await chapterService.linkPagesToChapter(mediaIdsOnly, chapter._id);

    return ApiResponse.success(
      res,
      chapter,
      "Bob muvaffaqiyatli yaratildi",
      201,
    );
  } catch (error) {
    if (error.code === 11000) {
      return ApiResponse.error(res, "Ushbu raqamli bob allaqachon mavjud", 400);
    }
    next(error);
  }
};

exports.deleteChapter = async (req, res, next) => {
  try {
    const { id: mangaId, chapterId } = req.params;

    const chapter = await Chapter.findById(chapterId).populate("pages.media");

    if (!chapter) {
      return ApiResponse.error(res, "Bob topilmadi", 404);
    }

    if (chapter.manga.toString() !== mangaId) {
      return ApiResponse.error(res, "Bu bob ushbu mangaga tegishli emas", 400);
    }

    await chapterService.deleteChapterAssets(chapter);

    await chapter.deleteOne();

    return ApiResponse.success(res, null, "Bob va sahifalar o'chirildi", 200);
  } catch (error) {
    next(error);
  }
};

exports.toggleReaction = async (req, res, next) => {
  try {
    const { chapterId } = req.params;

    const userId = req.user._id;

    const chapter = await Chapter.findById(chapterId).lean();

    if (!chapter) {
      return ApiResponse.error(res, "Bob topilmadi", 404);
    }

    const reaction = await Like.findOne({
      targetId: chapterId,
      targetType: "Chapter",
      user: userId,
    });

    if (reaction) {
      return ApiResponse.success(
        res,
        { score: chapter.stats.score, isLiked: true },
        "Rahmat aytilgan",
        200,
      );
    }

    await Like.create({
      user: req.user._id,
      targetId: chapterId,
      targetType: "Chapter",
      value: 1,
    });

    const updatedChapter = await Chapter.findByIdAndUpdate(
      chapterId,
      {
        $inc: { "stats.score": 1 },
      },
      { new: true },
    ).select("stats.score");

    return ApiResponse.success(
      res,
      { score: updatedChapter.stats.score, isLiked: true },
      "Rahmat aytildi",
      200,
    );
  } catch (error) {
    next(error);
  }
};

exports.checkIsUserReacted = async (req, res, next) => {
  try {
    const { chapterId } = req.params;
    const userId = req.user._id;

    if (!userId) {
      return ApiResponse.success(res, false, "", 200);
    }

    const reaction = await Like.findOne({
      targetId: chapterId,
      targetType: "Chapter",
      user: userId,
    });

    if (!reaction) {
      return ApiResponse.success(res, false, "", 200);
    }

    return ApiResponse.success(res, true, "", 200);
  } catch (error) {
    next(error);
  }
};
