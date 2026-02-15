const Chapter = require("../models/Chapter");
const ApiResponse = require("../utils/response");

exports.getChapterById = async (req, res, next) => {
  try {
    const { id: chapterId } = req.params;

    const chapter = await Chapter.findById(chapterId).populate("pages", "url").populate('manga', 'slug title')

    if (!chapter) {
      return ApiResponse.error(res, "Bob topilmadi", 404);
    }

    return ApiResponse.success(res, chapter, "Bob topildi", 200);
  } catch (error) {
    next(error);
  }
};
