const MangaType = require("../models/MangaType");
const ApiResponse = require("../utils/response");

// @desc    Get all manga types
// @route   GET /api/v1/manga-types
// @access  Public
exports.getAllMangaTypes = async (req, res, next) => {
  try {
    const mangaTypes = await MangaType.find();
    return ApiResponse.success(
      res,
      mangaTypes,
      "Manga types fetched successfully",
      200,
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Create a manga type
// @route   POST /api/v1/manga-types
// @access  Private (Admin)
exports.createMangaType = async (req, res, next) => {
  try {
    const { name } = req.body;

    // Check if type already exists
    const existingType = await MangaType.findOne({ name });
    if (existingType) {
      return ApiResponse.error(res, null, "Bunday tur allaqachon mavjud", 400);
    }

    const mangaType = await MangaType.create({ name });

    return ApiResponse.success(
      res,
      mangaType,
      "Manga type created successfully",
      201,
    );
  } catch (error) {
    next(error);
  }
};
