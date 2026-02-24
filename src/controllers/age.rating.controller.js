const AgeRating = require("../models/AgeRating");
const ApiResponse = require("../utils/response");

exports.createAgeRating = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return ApiResponse.error(res, "Yosh chegarasi nomi majburiy", 400);
    }
    const ageRating = await AgeRating.create({ name });
    return ApiResponse.success(
      res,
      ageRating,
      "Yosh chegarasi muvafaqqiyatli yaratildi",
      201,
    );
  } catch (error) {
    next(error);
  }
};

exports.getAllAgeRatings = async (req, res, next) => {
  try {
    const ageRatings = await AgeRating.find();
    return ApiResponse.success(res, ageRatings, "Muvafaqqiyatli", 200);
  } catch (error) {
    next(error);
  }
};
