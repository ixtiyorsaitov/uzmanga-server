const Media = require("../models/Media");
const Like = require("../models/Like");
const UniqueView = require("../models/UniqueView");
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

exports.attachUserInteractionsToChapters = async (
  chapters,
  userId,
  mangaId,
) => {
  if (!chapters || chapters.length === 0 || !userId) {
    return chapters.map((chapter) => ({
      ...chapter,
      isLiked: false,
      isRead: false,
    }));
  }

  const chapterIds = chapters.map((chapter) => chapter._id);

  const [userLikes, userReads] = await Promise.all([
    Like.find({
      user: userId,
      targetType: "Chapter",
      targetId: { $in: chapterIds },
    }).lean(),
    UniqueView.find({
      user: userId,
      targetId: { $in: chapterIds },
      targetModel: "Chapter",
      parentManga: mangaId,
    }).lean(),
  ]);

  const likedTargetIds = new Set(
    userLikes.map((like) => like.targetId.toString()),
  );

  const readChapterIds = new Set(
    userReads.map((read) => read.targetId.toString()),
  );

  return chapters.map((chapter) => ({
    ...chapter,
    isLiked: likedTargetIds.has(chapter._id.toString()),
    isRead: readChapterIds.has(chapter._id.toString()),
  }));
};
