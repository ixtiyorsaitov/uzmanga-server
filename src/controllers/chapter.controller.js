const Manga = require("../models/Manga");
const Chapter = require("../models/Chapter");
const Like = require("../models/Like");
const UniqueViewHistory = require("../models/UniqueView");
const chapterService = require("../services/chapter.service");
const progressService = require("../services/progress.service");
const viewService = require("../services/viewlog.service");
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

    const chaptersWithInteractions =
      await chapterService.attachUserInteractionsToChapters(
        chapters,
        userId,
        mangaId,
      );

    const totalChapters = await Chapter.countDocuments(query);

    return ApiResponse.success(
      res,
      {
        chapters: chaptersWithInteractions,
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
      .populate("createdBy", "name avatar")
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

    const manga = await Manga.findOne({
      _id: mangaId,
    })
      .select("createdBy translators")
      .lean();

    if (!manga) return ApiResponse.error(res, "Manga topilmadi", 404);

    if (
      manga.createdBy.toString() !== requestUser.toString() &&
      !manga.translators.includes(requestUser.toString())
    ) {
      return ApiResponse.error(res, "Ruxsat yo'q", 403);
    }

    if (!manga.isPublished) {
      if (!manga.approvedBy) {
        return ApiResponse.error(res, "Manga tasdiqlanmagan", 403);
      }
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

exports.updateChapter = async (req, res, next) => {
  try {
    const { chapterId } = req.params;
    const {
      title,
      chapterNumber,
      volumeNumber,
      isLocked,
      price,
      disableComments,
    } = req.body;
    const requestUser = req.user._id;

    // 1. Bobni va unga tegishli mangani, hamda RASMLARNI (pages.media) topamiz
    const chapter = await Chapter.findById(chapterId)
      .populate({
        path: "manga",
        select: "createdBy translators _id",
      })
      .populate("pages.media"); // <-- MANA SHU QISM JUDA MUHIM

    if (!chapter) return ApiResponse.error(res, "Bob topilmadi", 404);

    // 2. Ruxsatni tekshirish
    if (
      chapter.manga.createdBy.toString() !== requestUser.toString() &&
      !chapter.manga.translators.includes(requestUser.toString())
    ) {
      return ApiResponse.error(res, "Ruxsat yo'q", 403);
    }

    // 3. Bob raqami o'zgarayotgan bo'lsa, band emasligini tekshiramiz
    if (chapterNumber && parseFloat(chapterNumber) !== chapter.chapterNumber) {
      const existChapter = await Chapter.findOne({
        manga: chapter.manga._id,
        chapterNumber: parseFloat(chapterNumber),
      }).lean();

      if (existChapter) {
        return ApiResponse.error(
          res,
          "Ushbu raqamli bob allaqachon mavjud",
          400,
        );
      }
    }

    // 4. Agar YANGI sahifalar (rasmlar) yuklangan bo'lsa
    if (req.files && req.files.pages && req.files.pages.length) {
      // -- ESKI RASMLARNI O'CHIRISH (Service orqali) --
      try {
        await chapterService.deleteChapterAssets(chapter);
      } catch (deleteError) {
        console.error(
          "Eski rasmlarni o'chirishda xatolik yuz berdi:",
          deleteError,
        );
        // O'chirishdagi xatolik yangilashni to'xtatmasligi uchun catch qilib qo'yamiz
      }

      // -- YANGI RASMLARNI YUKLASH --
      const cNum = chapterNumber
        ? parseFloat(chapterNumber)
        : chapter.chapterNumber;

      const pagesData = await chapterService.uploadChapterPages(
        chapter.manga._id,
        cNum,
        req.files.pages,
      );

      const mediaIdsOnly = pagesData.map((page) => page.media);
      await chapterService.linkPagesToChapter(mediaIdsOnly, chapter._id);

      // Yangi rasmlarni chapter obyektiga o'zlashtiramiz
      chapter.pages = pagesData;
    }

    // 5. Boshqa ma'lumotlarni yangilash
    if (title !== undefined) chapter.title = title;
    if (chapterNumber !== undefined)
      chapter.chapterNumber = parseFloat(chapterNumber);
    if (volumeNumber !== undefined)
      chapter.volumeNumber = parseInt(volumeNumber);
    if (isLocked !== undefined)
      chapter.isLocked = isLocked === "true" || isLocked === true;
    if (price !== undefined) chapter.price = parseInt(price);
    if (disableComments !== undefined)
      chapter.disableComments =
        disableComments === "true" || disableComments === true;

    // O'zgarishlarni saqlaymiz
    await chapter.save();

    return ApiResponse.success(
      res,
      chapter,
      "Bob muvaffaqiyatli yangilandi",
      200,
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
    const { chapterId } = req.params;

    const chapter = await Chapter.findById(chapterId)
      .populate("pages.media")
      .populate("manga", "createdBy");

    if (!chapter) {
      return ApiResponse.error(res, "Bob topilmadi", 404);
    }

    if (
      chapter.createdBy.toString() !== req.user._id.toString() ||
      chapter.manga.createdBy.toString() !== req.user._id.toString()
    ) {
      return ApiResponse.error(res, "Ruxsat yo'q", 403);
    }

    await chapterService.deleteChapterAssets(chapter);

    await Chapter.findByIdAndDelete(chapter._id);

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

exports.markChapterAsRead = async (req, res, next) => {
  try {
    const { chapterId } = req.params;
    const userId = req.user?._id || null;

    const chapterExists = await Chapter.findById(chapterId).select("manga");

    if (!chapterExists) {
      return ApiResponse.error(res, "Bob topilmadi", 404);
    }

    const mangaId = chapterExists.manga;

    viewService.recordUniversalView(req, chapterId, "Chapter").catch((err) => {
      console.error("View service xatosi:", err);
    });

    let isNewUniqueView = false;
    const promises = [];

    if (userId) {
      const historyResult = await UniqueViewHistory.updateOne(
        { user: userId, targetId: chapterId, targetModel: "Chapter" },
        {
          $setOnInsert: {
            user: userId,
            targetId: chapterId,
            targetModel: "Chapter",
            parentManga: mangaId,
          },
        },
        { upsert: true },
      );

      if (historyResult.upsertedCount > 0) {
        isNewUniqueView = true;

        promises.push(
          Chapter.updateOne(
            { _id: chapterId },
            { $inc: { "stats.uniqueViews": 1 } },
          ).exec(),
        );
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }

    if (userId) {
      await progressService.syncMaxReadingProgress(userId, mangaId);
    }

    return ApiResponse.success(
      res,
      { isNewUniqueView },
      "Bob o'qilgan deb belgilandi.",
      200,
    );
  } catch (error) {
    next(error);
  }
};

exports.toggleReadStatus = async (req, res, next) => {
  try {
    const { chapterId } = req.params;
    const userId = req.user._id;

    const chapterExists = await Chapter.findById(chapterId).select("manga");
    if (!chapterExists) {
      return ApiResponse.error(res, "Bob topilmadi", 404);
    }
    const mangaId = chapterExists.manga;

    const existingHistory = await UniqueViewHistory.findOne({
      user: userId,
      targetId: chapterId,
      targetModel: "Chapter",
    });

    let isRead = false;

    if (existingHistory) {
      isRead = false;
      await UniqueViewHistory.deleteOne({ _id: existingHistory._id });
      await Chapter.updateOne(
        { _id: chapterId },
        { $inc: { "stats.uniqueViews": -1 } },
      );
    } else {
      isRead = true;
      await UniqueViewHistory.create({
        user: userId,
        targetId: chapterId,
        targetModel: "Chapter",
        parentManga: mangaId,
      });
      await Chapter.updateOne(
        { _id: chapterId },
        { $inc: { "stats.uniqueViews": 1 } },
      );
    }

    await progressService.syncMaxReadingProgress(userId, mangaId);

    return ApiResponse.success(
      res,
      { isRead },
      isRead ? "Bob o'qilgan deb belgilandi" : "Bob o'qilmagan deb belgilandi",
      200,
    );
  } catch (error) {
    next(error);
  }
};
