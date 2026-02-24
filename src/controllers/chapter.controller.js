const Manga = require("../models/Manga");
const Chapter = require("../models/Chapter");
const chapterService = require("../services/chapter.service");
const ApiResponse = require("../utils/response");

exports.getChaptersByMangaId = async (req, res, next) => {
  try {
    const { mangaId } = req.params;

    let { page = 1, limit = 10, search = "", ordering = "-index" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

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

    const totalChapters = await Chapter.countDocuments(query);

    return ApiResponse.success(
      res,
      {
        chapters,
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
    const chapter = await Chapter.findById(chapterId).populate("pages");
    if (!chapter) return ApiResponse.error(res, "Bob topilmadi", 404);
    return ApiResponse.success(res, chapter, "Bob topildi", 200);
  } catch (error) {
    next(error);
  }
};

exports.createChapter = async (req, res, next) => {
  try {
    const { id: mangaId } = req.params;
    const {
      title,
      chapterNumber,
      volumeNumber,
      isLocked,
      price,
      disableComments,
    } = req.body;
    const requestUser = "698d9d3ab53d93cb767b9aba";

    if (!chapterNumber) return ApiResponse.error(res, "Bob raqami shart", 400);

    const manga = await Manga.findById(mangaId);
    if (!manga) return ApiResponse.error(res, "Manga topilmadi", 404);

    if (!req.files?.pages?.length) {
      return ApiResponse.error(res, "Bob sahifalari yuklanishi shart", 400);
    }

    const pageIds = await chapterService.uploadChapterPages(
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
      pages: pageIds,
      createdBy: requestUser,
    });

    await chapterService.linkPagesToChapter(pageIds, chapter._id);

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

    const chapter = await Chapter.findById(chapterId).populate("pages");

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
