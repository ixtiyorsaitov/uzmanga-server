const Manga = require("../models/Manga");
const Media = require("../models/Media");
const MangaType = require("../models/MangaType");
const Category = require("../models/Category");
const Genre = require("../models/Genre");
const Chapter = require("../models/Chapter");
const slugify = require("slugify");
const ApiResponse = require("../utils/response");
const { uploadService, uploadFolders } = require("../services/upload.service");

exports.createManga = async (req, res, next) => {
  try {
    const {
      title,
      description,
      type,
      ageRating,
      releaseYear,
      status,
      translationStatus,
      categories,
      genres,
      slug: customSlug,
    } = req.body;

    const requestUser = "697b6fc624523752fdca8081";

    let finalSlug;

    // Create slug
    if (customSlug) {
      finalSlug = slugify(customSlug, { lower: true, strict: true });
    } else {
      finalSlug = slugify(title, { lower: true, strict: true });
    }

    // Check if slug already exists
    const existingSlug = await Manga.findOne({ slug: finalSlug });
    if (existingSlug) {
      return ApiResponse.error(
        res,
        "Bunday slugga ega manga allaqachon mavjud. Iltimos boshqa slug kiriting yoki titleni o'zgartiring",
        400,
      );
    }

    // Check if cover and banner are uploaded
    if (!req.files?.cover || !req.files?.banner) {
      const error = new Error(
        "Barcha rasmlar (cover, banner) yuklanishi shart",
      );
      error.status = 400;
      throw error;
    }

    // Check if categories are valid
    let categoryIds = [];
    if (categories) {
      categoryIds = Array.isArray(categories)
        ? categories
        : JSON.parse(categories);
      const count = await Category.countDocuments({
        _id: { $in: categoryIds },
      });
      if (count !== categoryIds.length) {
        return ApiResponse.error(res, "Ba'zi kategoriyalar topilmadi", 400);
      }
    }

    // Check if genres are valid
    let genreIds = [];
    if (genres) {
      genreIds = Array.isArray(genres) ? genres : JSON.parse(genres);
      const count = await Genre.countDocuments({ _id: { $in: genreIds } });
      if (count !== genreIds.length) {
        return ApiResponse.error(res, "Ba'zi janrlar topilmadi", 400);
      }
    }

    // Supabase upload
    const [coverUpload, bannerUpload] = await Promise.all([
      uploadService.uploadToStorage(
        req.files.cover[0],
        uploadFolders.MANGA_ASSETS.bucket,
        uploadFolders.MANGA_ASSETS.folders.MANGA_COVERS,
      ),
      uploadService.uploadToStorage(
        req.files.banner[0],
        uploadFolders.MANGA_ASSETS.bucket,
        uploadFolders.MANGA_ASSETS.folders.MANGA_BANNERS,
      ),
    ]);

    // Create manga
    const manga = await Manga.create({
      title,
      description,
      type,
      ageRating,
      slug: finalSlug,
      releaseYear: parseInt(releaseYear),
      status,
      translationStatus,
      categories: categoryIds,
      genres: genreIds,
      publishers: [requestUser],
      createdBy: requestUser,
    });

    // Create cover and banner media
    const [coverMedia, bannerMedia] = await Promise.all([
      Media.create({
        url: coverUpload.url,
        path: coverUpload.path,
        bucket: coverUpload.bucket,
        type: "COVER",
        refModel: "Manga",
        refId: manga._id,
      }),
      Media.create({
        url: bannerUpload.url,
        path: bannerUpload.path,
        bucket: bannerUpload.bucket,
        type: "BANNER",
        refModel: "Manga",
        refId: manga._id,
      }),
    ]);

    manga.images = {
      cover: coverMedia._id,
      banner: bannerMedia._id,
    };
    await manga.save();

    return ApiResponse.success(
      res,
      manga,
      "Manga muvaffaqiyatli yaratildi",
      201,
    );
  } catch (error) {
    next(error);
  }
};

exports.updateManga = async (req, res, next) => {
  try {
    const { id } = req.params;

    const manga = await Manga.findById(id).populate(
      "images.cover images.banner",
    );

    if (!manga) {
      return ApiResponse.error(res, "Manga topilmadi", 404);
    }

    if (req.body.slug) {
      let newSlug = slugify(req.body.slug, { lower: true, strict: true });

      // Agar yangi slug bazadagi hozirgi slugdan farq qilsa, unikallikka tekshiramiz
      if (newSlug !== manga.slug) {
        const existingSlug = await Manga.findOne({
          slug: newSlug,
          _id: { $ne: id },
        });

        if (existingSlug) {
          return ApiResponse.error(
            res,
            "Ushbu slug band. Iltimos boshqa slug tanlang",
            400,
          );
        }

        // Agar hamma narsa joyida bo'lsa, manganing slugini yangilaymiz
        manga.slug = newSlug;
      }
    }

    // Yangilashga ruxsat berilgan maydonlar
    const allowedFields = [
      "title",
      "description",
      "type",
      "ageRating",
      "releaseYear",
      "status",
      "translationStatus",
      "categories",
      "genres",
    ];

    // Update allowed fields
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        let value = req.body[field];

        // 1. Kategoriyalar va Janrlar uchun JSON parse qilish
        if (field === "categories" || field === "genres") {
          try {
            // Agar Frontend'dan string bo'lib kelayotgan bo'lsa parse qilamiz
            value = typeof value === "string" ? JSON.parse(value) : value;

            // Massiv ekanligini tasdiqlaymiz
            if (!Array.isArray(value)) value = [value];
          } catch (e) {
            // Agar parse xato bersa, demak bu oddiy string (masalan, bitta ID)
            value = Array.isArray(value) ? value : [value];
          }
        }

        // 2. Yilni raqamga o'tkazish
        if (field === "releaseYear") {
          value = parseInt(value);
        }

        manga[field] = value;
      }
    });

    // --- Cover yangilash ---
    if (req.files?.cover) {
      if (manga.images?.cover?.path) {
        await uploadService.deleteFromStorage(manga.images.cover.path);
        await Media.findByIdAndDelete(manga.images.cover._id);
      }

      const coverUpload = await uploadService.uploadToStorage(
        req.files.cover[0],
        uploadFolders.MANGA_ASSETS.bucket,
        uploadFolders.MANGA_ASSETS.folders.MANGA_COVERS,
      );

      const newCoverMedia = await Media.create({
        url: coverUpload.url,
        path: coverUpload.path,
        bucket: coverUpload.bucket,
        type: "COVER",
        refModel: "Manga",
        refId: manga._id,
      });

      manga.images.cover = newCoverMedia._id;
    }

    // --- Banner yangilash ---
    if (req.files?.banner) {
      if (manga.images?.banner?.path) {
        await uploadService.deleteFromStorage(manga.images.banner.path);
        await Media.findByIdAndDelete(manga.images.banner._id);
      }

      const bannerUpload = await uploadService.uploadToStorage(
        req.files.banner[0],
        uploadFolders.MANGA_ASSETS.bucket,
        uploadFolders.MANGA_ASSETS.folders.MANGA_BANNERS,
      );

      const newBannerMedia = await Media.create({
        url: bannerUpload.url,
        path: bannerUpload.path,
        bucket: bannerUpload.bucket,
        type: "BANNER",
        refModel: "Manga",
        refId: manga._id,
      });

      manga.images.banner = newBannerMedia._id;
    }

    // Saqlash
    await manga.save();

    return ApiResponse.success(
      res,
      manga,
      "Manga muvaffaqiyatli yangilandi",
      200,
    );
  } catch (error) {
    next(error);
  }
};

exports.deleteManga = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Mangani rasmlari bilan birga topamiz
    const manga = await Manga.findById(id).populate(
      "images.cover images.banner",
    );

    if (!manga) {
      return ApiResponse.error(res, "Manga topilmadi", 404);
    }

    // 2. Storage'dan va Media collection'dan rasmlarni o'chirish
    const mediaToDelete = [];
    const storagePathsToDelete = [];

    // Cover rasm bo'lsa, ro'yxatga qo'shamiz
    if (manga.images?.cover) {
      mediaToDelete.push(manga.images.cover._id);
      if (manga.images.cover.path) {
        storagePathsToDelete.push(
          uploadService.deleteFromStorage(manga.images.cover.path),
        );
      }
    }

    // Banner rasm bo'lsa, ro'yxatga qo'shamiz
    if (manga.images?.banner) {
      mediaToDelete.push(manga.images.banner._id);
      if (manga.images.banner.path) {
        storagePathsToDelete.push(
          uploadService.deleteFromStorage(manga.images.banner.path),
        );
      }
    }

    // Storage'dan rasmlarni va Media collection'dan ID'larni parallel o'chiramiz
    await Promise.all([
      ...storagePathsToDelete,
      Media.deleteMany({ _id: { $in: mediaToDelete } }),
    ]);

    // 3. Manga hujjatini bazadan o'chiramiz
    await Manga.findByIdAndDelete(id);

    return ApiResponse.success(
      res,
      null,
      "Manga va unga tegishli barcha fayllar o'chirildi",
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

exports.getMangaById = async (req, res, next) => {
  try {
    const mangaRaw = await Manga.findById(req.params.id)
      .populate({
        path: "images.cover images.banner",
        select: "url type -_id",
      })
      .populate("type", "name -_id")
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

exports.createMangaType = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return ApiResponse.error(res, "Manga turi nomi bo'lishi shart", 400);
  }

  const newMangaType = await MangaType.create({ name });

  return ApiResponse.success(
    res,
    newMangaType,
    "Manga turi muvaffaqiyatli yaratildi",
    201,
  );
};

exports.getAllMangaTypes = async (req, res, next) => {
  try {
    const mangaTypes = await MangaType.find().lean();
    return ApiResponse.success(res, mangaTypes, "Manga turlari olindi", 200);
  } catch (error) {
    next(error);
  }
};

exports.getMangaChapters = async (req, res, next) => {
  try {
    const { id: mangaId } = req.params;

    const chapters = await Chapter.find({ manga: mangaId })
      .populate({
        path: "pages",
        select: "url type -_id",
      })
      .sort({ chapterNumber: 1 })
      .lean();

    return ApiResponse.success(res, chapters, "Boblar olindi", 200);
  } catch (error) {
    next(error);
  }
};

exports.getChapterById = async (req, res, next) => {
  try {
    const { id: mangaId, chapterId } = req.params;

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
    const requestUser = "697b6fc624523752fdca8081";

    if (!title || !chapterNumber) {
      return ApiResponse.error(
        res,
        "Barcha ma'lumotlar kiritilishi shart",
        400,
      );
    }

    // 1. Manga borligini tekshirish
    const manga = await Manga.findById(mangaId);
    if (!manga) {
      return ApiResponse.error(res, "Manga topilmadi", 404);
    }

    // 2. Sahifalar (pages) yuborilganini tekshirish
    if (!req.files || !req.files.pages || req.files.pages.length === 0) {
      return ApiResponse.error(res, "Bob sahifalari yuklanishi shart", 400);
    }

    // 3. Sahifalarni storage'ga (Supabase) yuklash
    // Promise.all ishlatamiz, rasmlar parallel yuklanadi
    const uploadPromises = req.files.pages.map((file) =>
      uploadService.uploadToStorage(
        file,
        uploadFolders.MANGA_CHAPTERS.bucket,
        `${mangaId}/${chapterNumber}`,
      ),
    );
    const uploadedFiles = await Promise.all(uploadPromises);

    // 4. Media modelida sahifalarni yaratish
    const mediaPromises = uploadedFiles.map((file) =>
      Media.create({
        url: file.url,
        path: file.path,
        bucket: file.bucket,
        type: "CHAPTER",
        refModel: "Chapter",
      }),
    );
    const createdMedia = await Promise.all(mediaPromises);
    const pageIds = createdMedia.map((media) => media._id);

    // 5. Bobni bazada yaratish
    const chapter = await Chapter.create({
      manga: mangaId,
      title,
      chapterNumber: parseFloat(chapterNumber),
      volumeNumber: volumeNumber ? parseInt(volumeNumber) : 1,
      isLocked: isLocked === "true", // FormData string yuboradi
      price: price ? parseInt(price) : 0,
      disableComments: disableComments === "true",
      pages: pageIds,
      createdBy: requestUser,
    });

    // 6. Media'larga bob ID'sini biriktirib chiqish (refId)
    await Media.updateMany(
      { _id: { $in: pageIds } },
      { $set: { refId: chapter._id } },
    );

    return ApiResponse.success(
      res,
      chapter,
      "Bob muvaffaqiyatli yaratildi",
      201,
    );
  } catch (error) {
    // Agar bob raqami takrorlansa (Unique Index error)
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

    if (chapter.manga.toString() !== mangaId.toString()) {
      return ApiResponse.error(res, "Bu bob ushbu mangaga tegishli emas", 400);
    }

    if (chapter.pages && chapter.pages.length > 0) {
      const storagePaths = chapter.pages
        .filter((page) => page.path)
        .map((page) => page.path);

      if (storagePaths.length > 0) {
        await uploadService.deleteFromStorage(
          storagePaths,
          uploadFolders.MANGA_CHAPTERS.bucket,
        );
      }

      const mediaIds = chapter.pages.map((page) => page._id);
      await Media.deleteMany({ _id: { $in: mediaIds } });
    }
    await Chapter.findByIdAndDelete(chapterId);

    return ApiResponse.success(
      res,
      null,
      "Bob va unga tegishli barcha sahifalar o'chirildi",
      200,
    );
  } catch (error) {
    next(error);
  }
};
