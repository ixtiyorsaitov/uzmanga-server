const mongoose = require("mongoose");
const Manga = require("../models/Manga");
const Media = require("../models/Media");
const MangaType = require("../models/MangaType");
const Category = require("../models/Category");
const Genre = require("../models/Genre");
const Chapter = require("../models/Chapter");
const mangaUtils = require("../utils/manga.utils");
const mangaService = require("../services/manga.service");
const ApiResponse = require("../utils/response");
const { uploadService, uploadFolders } = require("../services/upload.service");

exports.createManga = async (req, res, next) => {
  try {
    const {
      title,
      categories,
      genres,
      slug: customSlug,
      ...mangaData
    } = req.body;
    const requestUser = "698d9d3ab53d93cb767b9aba"; // req.user.id bo'lishi kerak

    // 1. Slug yaratish va tekshirish
    const finalSlug = mangaUtils.generateSlug(title, customSlug);
    const existingSlug = await Manga.findOne({ slug: finalSlug });
    if (existingSlug) {
      return ApiResponse.error(
        res,
        "Ushbu slug band. Iltimos boshqa slug tanlang",
        400,
      );
    }

    // 2. Fayllar mavjudligini tekshirish
    if (!req.files?.cover || !req.files?.banner) {
      return ApiResponse.error(res, "Cover va banner yuklanishi shart", 400);
    }

    // 3. Kategoriya va janrlarni validatsiya qilish
    const [categoryIds, genreIds] = await Promise.all([
      mangaUtils.parseAndValidateIds(Category, categories),
      mangaUtils.parseAndValidateIds(Genre, genres),
    ]);

    // 4. Manganing asosiy qismini yaratish
    const manga = await Manga.create({
      ...mangaData,
      title,
      slug: finalSlug,
      categories: categoryIds,
      genres: genreIds,
      createdBy: requestUser,
      publishers: [requestUser],
      releaseYear: parseInt(mangaData.releaseYear),
    });

    // 5. Rasmlarni yuklash va bog'lash (Service orqali)
    const images = await mangaService.uploadMangaAssets(manga._id, req.files);

    manga.images = images;
    await manga.save();

    return ApiResponse.success(
      res,
      manga,
      "Manga muvaffaqiyatli yaratildi",
      201,
    );
  } catch (error) {
    // Utils'dan otilgan xatolarni tutib olish
    if (error.message.includes("topilmadi")) {
      return ApiResponse.error(res, error.message, 400);
    }
    next(error);
  }
};

exports.updateManga = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { categories, genres, slug: newSlugInput, ...updateData } = req.body;

    const manga = await Manga.findById(id).populate(
      "images.cover images.banner",
    );
    if (!manga) return ApiResponse.error(res, "Manga topilmadi", 404);

    if (newSlugInput) {
      const finalSlug = mangaUtils.generateSlug("", newSlugInput);
      if (finalSlug !== manga.slug) {
        const duplicate = await Manga.findOne({
          slug: finalSlug,
          _id: { $ne: id },
        });
        if (duplicate) return ApiResponse.error(res, "Ushbu slug band", 400);
        manga.slug = finalSlug;
      }
    }

    if (categories)
      manga.categories = await mangaUtils.parseAndValidateIds(
        Category,
        categories,
      );
    if (genres)
      manga.genres = await mangaUtils.parseAndValidateIds(Genre, genres);

    if (req.files) {
      const [newCoverId, newBannerId] = await Promise.all([
        mangaService.updateMangaImage(manga, req.files, "COVER"),
        mangaService.updateMangaImage(manga, req.files, "BANNER"),
      ]);
      manga.images = { cover: newCoverId, banner: newBannerId };
    }

    const allowed = [
      "title",
      "description",
      "type",
      "ageRating",
      "releaseYear",
      "status",
      "translationStatus",
    ];
    allowed.forEach((field) => {
      if (updateData[field] !== undefined) {
        manga[field] =
          field === "releaseYear"
            ? parseInt(updateData[field])
            : updateData[field];
      }
    });

    await manga.save();
    return ApiResponse.success(res, manga, "Manga yangilandi", 200);
  } catch (error) {
    next(error);
  }
};

exports.deleteManga = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Mangani rasmlari bilan topamiz
    const manga = await Manga.findById(id).populate(
      "images.cover images.banner",
    );
    if (!manga) return ApiResponse.error(res, "Manga topilmadi", 404);

    // 2. Assetlarni (rasmlarni) service orqali parallel o'chiramiz
    await mangaService.clearMangaAssets(manga);

    // 3. Mangani o'chiramiz
    await manga.deleteOne(); // findByIdAndDelete o'rniga deleteOne ishlatsangiz hooklar yaxshi ishlaydi

    return ApiResponse.success(
      res,
      null,
      "Manga va unga tegishli fayllar o'chirildi",
      200,
    );
  } catch (error) {
    next(error);
  }
};

exports.getAllMangas = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 12, 50);
    const skip = (page - 1) * limit;

    const mangasRaw = await Manga.find()
      .select("title status releaseYear images slug")
      .populate({
        path: "images.cover",
        select: "url type -_id",
      })
      .populate("type", "name -_id")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const mangas = mangasRaw.map((manga) => ({
      ...manga,
      type: manga.type?.name || null,
    }));

    return ApiResponse.success(
      res,
      {
        mangas,
        page,
        limit,
      },
      "Mangalar olindi",
      200,
    );
  } catch (error) {
    next(error);
  }
};

exports.getManga = async (req, res, next) => {
  try {
    const { id: identifier } = req.params;

    const isId = mongoose.Types.ObjectId.isValid(identifier);

    const query = isId
      ? Manga.findById(identifier)
      : Manga.findOne({ slug: identifier });

    const mangaRaw = await query
      .populate({
        path: "images.cover images.banner",
        select: "url type -_id",
      })
      .populate("type", "name -_id")
      .populate("categories")
      .populate("genres")
      .lean();

    if (!mangaRaw) {
      return ApiResponse.error(res, "Manga topilmadi", 404);
    }

    const manga = {
      ...mangaRaw,
      type: mangaRaw.type?.name || null,
    };

    return ApiResponse.success(res, manga, "Topildi", 200);
  } catch (error) {
    next(error);
  }
};

exports.createMangaType = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      return ApiResponse.error(res, "Manga turi nomi bo'lishi shart", 400);
    }

    // const exists = await MangaType.findOne({ name: name.trim() });
    // if (exists) {
    //   return ApiResponse.error(res, "Bunday manga turi allaqachon mavjud", 400);
    // }

    const newMangaType = await MangaType.create({ name: name.trim() });

    return ApiResponse.success(
      res,
      newMangaType,
      "Manga turi muvaffaqiyatli yaratildi",
      201,
    );
  } catch (error) {
    next(error);
  }
};

exports.getAllMangaTypes = async (req, res, next) => {
  try {
    const mangaTypes = await MangaType.find().lean();
    return ApiResponse.success(res, mangaTypes, "Manga turlari olindi", 200);
  } catch (error) {
    next(error);
  }
};

exports.getChapterById = async (req, res, next) => {
  try {
    const { id: mangaId, chapterId } = req.params;

    const isMangaId = mongoose.Types.ObjectId.isValid(mangaId);
    const isChapterId = mongoose.Types.ObjectId.isValid(chapterId);

    if (!isMangaId || !isChapterId) {
      return ApiResponse.error(res, "Manga yoki bob ID si noto'g'ri", 400);
    }

    const chapter = await Chapter.findOne({ manga: mangaId, _id: chapterId })
      .populate({
        path: "pages",
        select: "url type -_id",
      })
      .lean();

    if (!chapter) {
      return ApiResponse.error(res, "Bob topilmadi", 404);
    }

    return ApiResponse.success(res, chapter, "Topildi", 200);
  } catch (error) {
    next(error);
  }
};
