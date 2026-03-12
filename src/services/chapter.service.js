const Media = require("../models/Media");
const { uploadService, uploadFolders } = require("./upload.service");

exports.uploadChapterPages = async (mangaId, chapterNumber, files) => {
  const uploadPromises = files.map((file) =>
    uploadService.uploadToStorage(
      file,
      uploadFolders.MANGA_CHAPTERS.bucket,
      `${mangaId}/${chapterNumber}`,
    ),
  );
  const uploadedFiles = await Promise.all(uploadPromises);

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

  return createdMedia.map((media, index) => ({
    media: media._id,
    pageNumber: index + 1,
  }));
};

exports.linkPagesToChapter = async (pageIds, chapterId) => {
  return await Media.updateMany(
    { _id: { $in: pageIds } },
    { $set: { refId: chapterId } },
  );
};

exports.deleteChapterAssets = async (chapter) => {
  if (!chapter.pages || chapter.pages.length === 0) return;

  const storagePaths = chapter.pages
    .filter((page) => page.media && page.media.path)
    .map((page) => page.media.path);

  const mediaIds = chapter.pages
    .filter((page) => page.media)
    .map((page) => page.media._id);

  try {
    if (storagePaths.length > 0) {
      await uploadService.deleteFromStorage(
        storagePaths,
        uploadFolders.MANGA_CHAPTERS.bucket,
      );
    }

    if (mediaIds.length > 0) {
      await Media.deleteMany({ _id: { $in: mediaIds } });
    }
  } catch (error) {
    console.error("Fayllarni o'chirishda xatolik:", error);
    throw error;
  }
};

exports.attachUserLikesToChapters = async (chapters, userId) => {
  // 1. Agar boblar ro'yxati bo'sh bo'lsa yoki foydalanuvchi kirmagan bo'lsa
  // hamma boblarga avtomatik isLiked: false qo'shib qaytaramiz
  if (!chapters || chapters.length === 0 || !userId) {
    return chapters.map((chapter) => ({ ...chapter, isLiked: false }));
  }

  // 2. Barcha boblarning ID larini ajratib olamiz
  const chapterIds = chapters.map((chapter) => chapter._id);

  // 3. Ushbu boblarga nisbatan joriy foydalanuvchi bosgan barcha reaksiyalarni olib kelamiz
  const userLikes = await Like.find({
    user: userId,
    targetType: "Chapter", // Bu sizning Like modelingizdagi enum ga mos bo'lishi kerak
    targetId: { $in: chapterIds },
  }).lean();

  // 4. Qidirish tezligi O(1) bo'lishi uchun xeshmep (Set) yaratamiz.
  // Agar like bosilgan bo'lsa, uning ID si shu to'plamda mavjud bo'ladi.
  const likedTargetIds = new Set(
    userLikes.map((like) => like.targetId.toString()),
  );

  // 5. Har bir bobga isLiked: true/false qilib yopishtirib qaytaramiz
  return chapters.map((chapter) => ({
    ...chapter,
    isLiked: likedTargetIds.has(chapter._id.toString()),
  }));
};
