const Media = require("../models/Media");
const Manga = require("../models/Manga");
const mangaUtils = require("../utils/manga.utils");
const Category = require("../models/Category");
const Genre = require("../models/Genre");
const MangaType = require("../models/MangaType");
const AgeRating = require("../models/AgeRating");
const MangaStatus = require("../models/MangaStatus");
const TranslationStatus = require("../models/TranslationStatus");
const Chapter = require("../models/Chapter");
const { uploadService, uploadFolders } = require("./upload.service");
const chapterService = require("../services/chapter.service");

exports.checkSlugUniqueness = async (slug) => {
  const existing = await Manga.findOne({ slug });
  if (existing)
    throw new Error("Ushbu slug band yoki ariza sifatida yuborilgan.");
};

exports.validateMangaRelations = async (data) => {
  const [
    categoryIds,
    genreIds,
    validatedType,
    validatedAge,
    validatedStatus,
    validatedTransStatus,
  ] = await Promise.all([
    mangaUtils.parseAndValidateIds(Category, data.categories),
    mangaUtils.parseAndValidateIds(Genre, data.genres),
    mangaUtils.checkExists(MangaType, data.type, "Manga turi"),
    mangaUtils.checkExists(AgeRating, data.ageRating, "Yosh reytingi"),
    mangaUtils.checkExists(MangaStatus, data.status, "Manga statusi"),
    mangaUtils.checkExists(
      TranslationStatus,
      data.translationStatus,
      "Tarjima statusi",
    ),
  ]);

  return {
    categories: categoryIds,
    genres: genreIds,
    type: validatedType,
    ageRating: validatedAge,
    status: validatedStatus,
    translationStatus: validatedTransStatus,
    releaseYear: parseInt(data.releaseYear),
    alternativeTitles: {
      en: data.enTitle || "",
      ru: data.ruTitle || "",
      romaji: data.romajiTitle || "",
      native: data.nativeTitle || "",
    },
    seo: {
      keywords:
        typeof data.metaKeywords === "string"
          ? JSON.parse(data.metaKeywords)
          : data.metaKeywords,
      title: data.metaTitle || "",
      description: data.metaDescription || "",
    },
  };
};

exports.uploadMangaAssets = async (mangaId, files) => {
  const [coverUpload, bannerUpload] = await Promise.all([
    uploadService.uploadToStorage(
      files.cover[0],
      uploadFolders.MANGA_ASSETS.bucket,
      uploadFolders.MANGA_ASSETS.folders.MANGA_COVERS,
    ),
    uploadService.uploadToStorage(
      files.banner[0],
      uploadFolders.MANGA_ASSETS.bucket,
      uploadFolders.MANGA_ASSETS.folders.MANGA_BANNERS,
    ),
  ]);

  const [coverMedia, bannerMedia] = await Promise.all([
    Media.create({
      url: coverUpload.url,
      path: coverUpload.path,
      bucket: coverUpload.bucket,
      type: "COVER",
      refModel: "Manga",
      refId: mangaId,
    }),
    Media.create({
      url: bannerUpload.url,
      path: bannerUpload.path,
      bucket: bannerUpload.bucket,
      type: "BANNER",
      refModel: "Manga",
      refId: mangaId,
    }),
  ]);

  return { cover: coverMedia._id, banner: bannerMedia._id };
};

exports.updateMangaImage = async (manga, files, type) => {
  const fieldName = type.toLowerCase();

  if (files && files[fieldName]) {
    const oldMedia = manga.images[fieldName];
    if (oldMedia && oldMedia.path) {
      await uploadService.deleteFromStorage(
        oldMedia.path,
        uploadFolders.MANGA_ASSETS.bucket,
      );
      await Media.findByIdAndDelete(oldMedia._id);
    }

    const folder = type === "COVER" ? "MANGA_COVERS" : "MANGA_BANNERS";
    const upload = await uploadService.uploadToStorage(
      files[fieldName][0],
      uploadFolders.MANGA_ASSETS.bucket,
      uploadFolders.MANGA_ASSETS.folders[folder],
    );
    const newMedia = await Media.create({
      url: upload.url,
      path: upload.path,
      bucket: upload.bucket,
      type: type,
      refModel: "Manga",
      refId: manga._id,
    });

    return newMedia._id;
  }
  return manga.images[fieldName]?._id;
};

exports.clearMangaAssets = async (manga) => {
  const mediaIds = [];
  const deletePromises = [];

  const images = [manga.images?.cover, manga.images?.banner];

  images.forEach((img) => {
    if (img) {
      mediaIds.push(img._id);
      if (img.path) {
        deletePromises.push(
          uploadService.deleteFromStorage(
            img.path,
            uploadFolders.MANGA_ASSETS.bucket,
          ),
        );
      }
    }
  });

  if (mediaIds.length > 0) {
    deletePromises.push(Media.deleteMany({ _id: { $in: mediaIds } }));
  }

  await Promise.all(deletePromises);
};

exports.clearMangaChapters = async (manga) => {
  const chapters = await Chapter.find({ manga: manga._id }).populate("pages");

  const chapterDeletePromises = chapters.map((chapter) =>
    chapterService.deleteChapterAssets(chapter),
  );

  await Promise.all(chapterDeletePromises);

  await Chapter.deleteMany({ manga: manga._id });
};

exports.updateReadingProgress = async (userId, mangaId, chapterId) => {
  if (!userId) return;

  try {
    await ReadingProgress.findOneAndUpdate(
      { user: userId, manga: mangaId },
      {
        lastReadChapter: chapterId,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );
  } catch (error) {
    throw new Error("Progress saqlashda xatolik");
  }
};
