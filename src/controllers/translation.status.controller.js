const TranslationStatus = require("../models/TranslationStatus");
const ApiResponse = require("../utils/response");

exports.createTranslationStatus = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return ApiResponse.error(res, "Tarjima status nomi majburiy", 400);
    }
    const translationStatus = await TranslationStatus.create({ name });
    return ApiResponse.success(
      res,
      translationStatus,
      "Tarjima status muvafaqqiyatli yaratildi",
      201,
    );
  } catch (error) {
    next(error);
  }
};

exports.getAllTranslationStatuses = async (req, res, next) => {
  try {
    const translationStatuses = await TranslationStatus.find();
    return ApiResponse.success(res, translationStatuses, "Muvafaqqiyatli", 200);
  } catch (error) {
    next(error);
  }
};
