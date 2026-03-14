const UniqueView = require("../models/UniqueView");
const Chapter = require("../models/Chapter");
const ReadingProgress = require("../models/ReadingProgress");

exports.syncMaxReadingProgress = async (userId, mangaId) => {
  try {
    const readHistories = await UniqueView.find({
      user: userId,
      parentManga: mangaId,
      targetModel: "Chapter",
    })
      .select("targetId")
      .lean();

    const readChapterIds = readHistories.map((history) => history.targetId);

    if (readChapterIds.length === 0) {
      await ReadingProgress.deleteOne({ user: userId, manga: mangaId });
      return null;
    }
    const highestChapter = await Chapter.findOne({
      _id: { $in: readChapterIds },
    })
      .sort({ volumeNumber: -1, chapterNumber: -1 })
      .select("_id")
      .lean();

    if (highestChapter) {
      await ReadingProgress.updateOne(
        { user: userId, manga: mangaId },
        { $set: { lastReadChapter: highestChapter._id } },
        { upsert: true },
      );
      return highestChapter._id;
    }
  } catch (error) {
    console.error("Progressni sinxronlashda xatolik:", error);
  }
};
