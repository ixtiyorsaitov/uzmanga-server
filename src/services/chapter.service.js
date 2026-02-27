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

  return createdMedia.map((media) => media._id);
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
    .filter((page) => page.path)
    .map((page) => page.path);

  const mediaIds = chapter.pages.map((page) => page._id);

  try {
    if (storagePaths.length > 0) {
      await uploadService.deleteFromStorage(
        storagePaths,
        uploadFolders.MANGA_CHAPTERS.bucket,
      );
    }

    await Media.deleteMany({ _id: { $in: mediaIds } });
  } catch (error) {
    console.error("Fayllarni o'chirishda xatolik:", error);
    throw error;
  }
};
