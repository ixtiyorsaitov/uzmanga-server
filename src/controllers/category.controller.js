const Category = require("../models/Category");
const ApiResponse = require("../utils/response");

exports.createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return ApiResponse.error(res, "Kategoriya nomi majburiy", 400);
    }
    const category = await Category.create({ name });
    return ApiResponse.success(
      res,
      category,
      "Kategoriya muvafaqqiyatli yaratildi",
      201,
    );
  } catch (error) {
    next(error);
  }
};

exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find();
    return ApiResponse.success(res, categories, "Muvafaqqiyatli", 200);
  } catch (error) {
    next(error);
  }
};
