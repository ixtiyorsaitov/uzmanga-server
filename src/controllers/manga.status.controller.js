const MangaStatus = require("../models/MangaStatus");
const ApiResponse = require("../utils/response");

exports.createMangaStatus = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return ApiResponse.error(res, "Manga status nomi majburiy", 400);
    }
    const mangaStatus = await MangaStatus.create({ name });
    return ApiResponse.success(
      res,
      mangaStatus,
      "Manga status muvafaqqiyatli yaratildi",
      201,
    );
  } catch (error) {
    next(error);
  }
};

exports.getAllMangaStatuses = async (req, res, next) => {
  try {
    const mangaStatuses = await MangaStatus.find();
    return ApiResponse.success(res, mangaStatuses, "Muvafaqqiyatli", 200);
  } catch (error) {
    next(error);
  }
};
