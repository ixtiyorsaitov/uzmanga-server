const Genre = require("../models/Genre");
const ApiResponse = require("../utils/response");

exports.createGenre = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return ApiResponse.error(res, "Janr nomi majburiy", 400);
    }
    const genre = await Genre.create({ name });
    return ApiResponse.success(res, genre, "Janr muvafaqqiyatli yaratildi", 201);
  } catch (error) {
    next(error);
  }
};

exports.getAllGenres = async (req, res, next) => {
  try {
    const genres = await Genre.find();
    return ApiResponse.success(res, genres, "Muvafaqqiyatli", 200);
  } catch (error) {
    next(error);
  }
};
