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
const ReadingProgress = require("../models/ReadingProgress");
const ViewLog = require("../models/ViewLog");
const mangaUtils = require("../utils/manga.utils");
const applicationService = require("../services/application.service");
const mangaService = require("../services/manga.service");
const ApiResponse = require("../utils/response");
const { recordUniversalView } = require("../services/viewlog.service");

exports.createManga = async (req, res, next) => {
  try {
    const requestUser = req.user;
    const isAdminOrMod = ["admin", "moderator"].includes(requestUser.role);

    // 1. Ma'lumotlarni tayyorlash va Moderatsiya holatini aniqlash
    const { messageToModerator, ...bodyData } = req.body;

    // Agar admin bo'lsa body'dan kelgan statusni oladi, bo'lmasa doim 'pending'
    const isPublished = isAdminOrMod ? req.body.isPublished || false : false;

    // 2. Slug va Takrorlanishni tekshirish
    const finalSlug = mangaUtils.generateSlug(bodyData.title, bodyData.slug);
    await mangaService.checkSlugUniqueness(finalSlug);

    // 3. Rasmlar borligini tekshirish
    if (!req.files?.cover || !req.files?.banner) {
      return ApiResponse.error(res, "Muqova va banner yuklanishi shart", 400);
    }

    // 4. ID larni validatsiya qilish (Category, Genre, Type va h.k.)
    const validatedData = await mangaService.validateMangaRelations(bodyData);

    // 5. Mangani bazada yaratish
    const manga = await Manga.create({
      ...bodyData,
      ...validatedData,
      slug: finalSlug,
      isPublished,
      approvedBy: isAdminOrMod ? requestUser._id : null,
      createdBy: requestUser._id,
      publishers: [requestUser._id],
    });

    // 6. Rasmlarni yuklash (Storage servis orqali)
    const images = await mangaService.uploadMangaAssets(manga._id, req.files);
    manga.images = images;
    await manga.save();

    // 7. AGAR USER TRANSLATOR BO'LSA: Ariza (Application) yaratish
    if (!isAdminOrMod) {
      await applicationService.createMangaApplication({
        userId: requestUser._id,
        message: messageToModerator,
        mangaId: manga._id,
      });
    }

    const message = isAdminOrMod
      ? "Manga muvaffaqiyatli yaratildi"
      : "Manga yaratish uchun ariza yuborildi";
    return ApiResponse.success(res, manga, message, 201);
  } catch (error) {
    next(error);
  }
};

exports.updateManga = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requestUser = req.user;
    const isAdminOrMod = ["admin", "moderator"].includes(requestUser.role);

    // 1. Mangani bazadan izlash
    const manga = await Manga.findById(id).populate(
      "images.cover images.banner",
    );
    if (!manga) return ApiResponse.error(res, "Manga topilmadi", 404);

    // 2. Ruxsatlarni tekshirish (Faqat egasi yoki Admin/Moderator tahrirlay oladi)
    const isOwner = manga.createdBy.toString() === requestUser._id.toString();
    if (!isOwner && !isAdminOrMod) {
      return ApiResponse.error(
        res,
        "Sizda bu mangani tahrirlash uchun ruxsat yo'q",
        403,
      );
    }

    const {
      isPublished,
      categories,
      genres,
      metaTitle,
      metaDescription,
      metaKeywords,
      enTitle,
      ruTitle,
      romajiTitle,
      nativeTitle,
      slug: newSlugInput,
      ...updateData
    } = req.body;

    // 4. Slug'ni yangilash va takrorlanishni tekshirish
    if (newSlugInput) {
      // Yangi title bo'lsa shundan, yo'qsa eskisidan slug yasaladi
      const titleToSlugify = updateData.title || manga.title;
      const finalSlug = mangaUtils.generateSlug(titleToSlugify, newSlugInput);

      if (finalSlug !== manga.slug) {
        const duplicate = await Manga.findOne({
          slug: finalSlug,
          _id: { $ne: id }, // Faqat isPublished emas, hamma mangalardan qidiramiz
        });
        if (duplicate) return ApiResponse.error(res, "Ushbu slug band", 400);
        manga.slug = finalSlug;
      }
    }

    // 5. Admin / Moderator uchun isPublished'ni yangilash
    if (isAdminOrMod && isPublished !== undefined) {
      // String bo'lib kelishi mumkinligini inobatga olib boolean ga o'tkazamiz
      const publishedStatus = isPublished === "true" || isPublished === true;
      manga.isPublished = publishedStatus;

      // Agar tasdiqlanayotgan bo'lsa, kim tasdiqlaganini yozib qo'yamiz
      if (publishedStatus && !manga.approvedBy) {
        manga.approvedBy = requestUser._id;
      }
    }

    // 6. Kategoriya va Janrlarni yangilash (mangaUtils orqali)
    if (categories) {
      manga.categories = await mangaUtils.parseAndValidateIds(
        Category,
        categories,
      );
    }
    if (genres) {
      manga.genres = await mangaUtils.parseAndValidateIds(Genre, genres);
    }

    // 7. Rasmlarni yangilash
    if (req.files && (req.files.cover || req.files.banner)) {
      const [newCoverId, newBannerId] = await Promise.all([
        req.files.cover
          ? mangaService.updateMangaImage(manga, req.files, "COVER")
          : Promise.resolve(manga.images?.cover),
        req.files.banner
          ? mangaService.updateMangaImage(manga, req.files, "BANNER")
          : Promise.resolve(manga.images?.banner),
      ]);
      manga.images = { cover: newCoverId, banner: newBannerId };
    }

    // 8. SEO va Alternativ nomlarni yangilash
    if (metaTitle || metaDescription || metaKeywords) {
      const parsedKeywords =
        typeof metaKeywords === "string"
          ? JSON.parse(metaKeywords)
          : metaKeywords;

      manga.seo = {
        ...manga.seo,
        title: metaTitle !== undefined ? metaTitle : manga.seo.title,
        description:
          metaDescription !== undefined
            ? metaDescription
            : manga.seo.description,
        keywords:
          parsedKeywords !== undefined ? parsedKeywords : manga.seo.keywords,
      };
    }

    if (enTitle || ruTitle || romajiTitle || nativeTitle) {
      manga.alternativeTitles = {
        ...manga.alternativeTitles,
        en: enTitle !== undefined ? enTitle : manga.alternativeTitles.en,
        ru: ruTitle !== undefined ? ruTitle : manga.alternativeTitles.ru,
        romaji:
          romajiTitle !== undefined
            ? romajiTitle
            : manga.alternativeTitles.romaji,
        native:
          nativeTitle !== undefined
            ? nativeTitle
            : manga.alternativeTitles.native,
      };
    }

    // 9. Asosiy maydonlarni (Primitive data types) yangilash
    const allowedFields = [
      "title",
      "description",
      "type",
      "ageRating",
      "releaseYear",
      "status",
      "translationStatus",
    ];

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        manga[field] =
          field === "releaseYear"
            ? parseInt(updateData[field])
            : updateData[field];
      }
    });

    // 10. Saqlash va javob qaytarish
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

    const mangas = await Manga.find({
      isPublished: true,
    })
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

    const userId = req.user ? req.user._id.toString() : null;

    const query = Manga.findOne(
      isId ? { _id: identifier } : { slug: identifier },
    );

    const manga = await query
      .populate({
        path: "images.cover images.banner",
        select: "url type -_id",
      })
      .populate("type", "name")
      .populate("categories", "name")
      .populate("genres", "name")
      .populate("createdBy", "name avatar")
      .populate("status", "name")
      .populate("translationStatus", "name")
      .populate("ageRating", "name")
      .lean();

    if (!manga) {
      return ApiResponse.error(res, "Manga topilmadi", 404);
    }

    if (!manga.isPublished) {
      const creatorId = manga.createdBy._id.toString();
      const userRole = req.user?.role;

      const hasAccess =
        userId === creatorId ||
        userRole === "admin" ||
        userRole === "moderator";

      console.log(hasAccess);

      if (!hasAccess) {
        return ApiResponse.error(res, "Manga topilmadi", 404);
      }
    }

    recordUniversalView(req, manga._id.toString(), "Manga").catch((err) =>
      console.error("View background xatosi:", err),
    );

    let userProgress = null;
    if (userId) {
      userProgress = await ReadingProgress.findOne({
        user: userId,
        manga: manga._id,
      }).populate("lastReadChapter", "title chapterNumber slug volumeNumber");
    }

    const mangaWithProgress = {
      ...manga,
      userProgress: userProgress ? userProgress.lastReadChapter : null,
    };

    return ApiResponse.success(res, mangaWithProgress, "Topildi", 200);
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

exports.getMangaAnalytics = async (req, res, next) => {
  try {
    const { mangaId } = req.params;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const analytics = await ViewLog.aggregate([
      // 1-bosqich: Filtr (Faqat oxirgi 30 kun va aynan shu manga)
      {
        $match: {
          targetId: new mongoose.Types.ObjectId(mangaId),
          targetModel: "Manga",
          createdAt: { $gte: thirtyDaysAgo }, // $gte = Greater than or equal (Katta yoki teng)
        },
      },
      // 2-bosqich: Guruhlash (Har bir kun uchun)
      {
        $group: {
          // createdAt vaqtini "YYYY-MM-DD" formatiga o'tkazib, shunga qarab guruhlaymiz
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          // Shu kunga to'g'ri kelgan hujjatlarni 1 tadan qo'shib sanaymiz
          viewsCount: { $sum: 1 },
        },
      },
      // 3-bosqich: Tartiblash (Sana bo'yicha o'sish tartibida: eskidan yangiga)
      {
        $sort: { _id: 1 },
      },
    ]);

    /* Kutilayotgan natija formati:
      [
        { "_id": "2023-10-25", "viewsCount": 145 },
        { "_id": "2023-10-26", "viewsCount": 210 },
        ...
      ]
    */

    // 3. (Ixtiyoriy) Agar ba'zi kunlarda umuman view bo'lmagan bo'lsa,
    // ular natijada yo'q bo'lib qoladi. Front-end chart buzilmasligi uchun
    // bo'sh kunlarni 0 qilib to'ldirib yuborish mumkin (JS qismida).

    return ApiResponse.success(res, analytics, "Analitika olindi", 200);
  } catch (error) {
    next(error);
  }
};

exports.getLatestUpdates = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;

    const query = {
      lastChapter: { $exists: true, $ne: null },
      "lastChapter.publishedAt": { $exists: true },
      moderationStatus: "published",
    };

    const latestMangas = await Manga.find(query)
      .sort({ "lastChapter.publishedAt": -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate({
        path: "images.cover",
        select: "url",
      })
      .select("title slug images.cover lastChapter");

    return ApiResponse.success(
      res,
      latestMangas,
      "Oxirgi yangilanishlar olindi",
    );
  } catch (error) {
    next(error);
  }
};
