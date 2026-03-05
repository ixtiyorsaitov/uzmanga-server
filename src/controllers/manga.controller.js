const mongoose = require("mongoose");
const Manga = require("../models/Manga");
const Media = require("../models/Media");
const MangaType = require("../models/MangaType");
const MangaStatus = require("../models/MangaStatus");
const TranslationStatus = require("../models/TranslationStatus");
const Category = require("../models/Category");
const AgeRating = require("../models/AgeRating");
const Genre = require("../models/Genre");
const Chapter = require("../models/Chapter");
const mangaUtils = require("../utils/manga.utils");
const mangaService = require("../services/manga.service");
const ApiResponse = require("../utils/response");
const { uploadService, uploadFolders } = require("../services/upload.service");

exports.createManga = async (req, res, next) => {
  try {
    let {
      title,
      categories,
      genres,
      type,
      ageRating,
      status,
      translationStatus,
      releaseYear,
      slug: customSlug,
      ...mangaData
    } = req.body;

    const requestUser = req.user._id;

    // 2. String bo'lib kelgan massivlarni parse qilish (Agar kerak bo'lsa)
    const parsedCategories =
      typeof categories === "string" ? JSON.parse(categories) : categories;
    const parsedGenres =
      typeof genres === "string" ? JSON.parse(genres) : genres;

    // 3. Slug tekshiruvi
    const finalSlug = mangaUtils.generateSlug(title, customSlug);
    const existingSlug = await Manga.findOne({ slug: finalSlug });
    if (existingSlug) {
      return ApiResponse.error(res, "Ushbu slug band.", 400);
    }

    // 4. Fayllar (FormData orqali kelgan rasmllar)
    if (!req.files?.cover || !req.files?.banner) {
      return ApiResponse.error(res, "Cover va banner yuklanishi shart", 400);
    }

    // 5. Validatsiya (Oldingi javobdagi mantiq)
    const [
      categoryIds,
      genreIds,
      validatedType,
      validatedAge,
      validatedStatus,
      validatedTransStatus,
    ] = await Promise.all([
      mangaUtils.parseAndValidateIds(Category, parsedCategories),
      mangaUtils.parseAndValidateIds(Genre, parsedGenres),
      mangaUtils.checkExists(MangaType, type, "Manga turi"),
      mangaUtils.checkExists(AgeRating, ageRating, "Yosh reytingi"),
      mangaUtils.checkExists(MangaStatus, status, "Manga statusi"),
      mangaUtils.checkExists(
        TranslationStatus,
        translationStatus,
        "Tarjima statusi",
      ),
    ]);

    // 6. Saqlash
    const manga = await Manga.create({
      ...mangaData,
      title,
      slug: finalSlug,
      type: validatedType,
      ageRating: validatedAge,
      status: validatedStatus,
      translationStatus: validatedTransStatus,
      categories: categoryIds,
      genres: genreIds,
      createdBy: requestUser,
      publishers: [requestUser],
      releaseYear: parseInt(releaseYear), // FormData string qaytargani uchun parseint shart
    });

    // 7. Servis orqali rasmlarni yuklash
    const images = await mangaService.uploadMangaAssets(manga._id, req.files);
    manga.images = images;
    await manga.save();

    return ApiResponse.success(res, manga, "Manga yaratildi", 201);
  } catch (error) {
    console.log(error);
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

    const manga = await Manga.findById(id).populate(
      "images.cover images.banner",
    );

    if (!manga) {
      return ApiResponse.error(res, "Manga topilmadi", 404);
    }
    console.log(manga.images);

    await mangaService.clearMangaAssets(manga);

    await Manga.findByIdAndDelete(id);

    await mangaService.clearMangaChapters(manga);

    return ApiResponse.success(
      res,
      null,
      "Manga va uning fayllari to'liq o'chirildi",
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
      .populate("categories", "name")
      .populate("genres", "name")
      .populate("genres")
      .populate("createdBy", "name avatar")
      .populate("status", "name")
      .populate("translationStatus", "name")
      .populate("ageRating", "name")
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
