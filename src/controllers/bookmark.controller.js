const Bookmark = require("../models/Bookmark.js");
const ApiResponse = require("../utils/response.js");
const mongoose = require("mongoose");

exports.checkIsBookmarked = async (req, res, next) => {
  try {
    const { mangaId } = req.params;
    const isId = mongoose.Types.ObjectId.isValid(mangaId);

    if (!isId) {
      return ApiResponse.error(res, "Manga ID noto'g'ri!", 400);
    }

    const userId = req.user?._id || null;
    if (!userId) {
      return ApiResponse.success(res, null, "Xatcho'pda yo'q");
    }

    const bookmark = await Bookmark.findOne({
      user: userId,
      manga: mangaId,
    });

    if (!bookmark) {
      return ApiResponse.success(res, null, "Xatcho'pda yo'q");
    }

    return ApiResponse.success(res, bookmark, "Xatcho'pda bor");
  } catch (error) {
    next(error);
  }
};

exports.toggleBookmark = async (req, res, next) => {
  try {
    const { mangaId } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    if (!mangaId) {
      return ApiResponse.error(res, "Manga ID majburiy!", 400);
    }

    const isId = mongoose.Types.ObjectId.isValid(mangaId);
    if (!isId) {
      return ApiResponse.error(res, "Manga ID noto'g'ri!", 400);
    }

    // 1. Xatcho'p avvaldan bor-yo'qligini tekshiramiz
    let bookmark = await Bookmark.findOne({ user: userId, manga: mangaId });

    if (!bookmark) {
      // 2. Agar YO'Q bo'lsa, yangi yaratamiz (Bu yerda Manga stats avtomatik +1 bo'ladi)
      bookmark = new Bookmark({ user: userId, manga: mangaId, status });
    } else {
      // 3. Agar BOR bo'lsa, shunchaki statusni yangilaymiz (Stats o'zgarmaydi)
      bookmark.status = status;
    }

    // Hujjatni saqlaymiz (Hook'lar shu yerda ishga tushadi)
    await bookmark.save();

    // Javob qaytarishdan oldin manga ma'lumotlarini biriktiramiz
    await bookmark.populate("manga", "title coverImage");

    return ApiResponse.success(res, bookmark, "Xatcho'pga saqlandi");
  } catch (error) {
    next(error);
  }
};

exports.deleteBookmark = async (req, res, next) => {
  try {
    const { mangaId } = req.params;
    const userId = req.user._id;

    const isId = mongoose.Types.ObjectId.isValid(mangaId);

    if (!isId) {
      return ApiResponse.error(res, "Manga ID noto'g'ri!", 400);
    }

    const bookmark = await Bookmark.findOneAndDelete({
      user: userId,
      manga: mangaId,
    });

    return ApiResponse.success(res, bookmark, "Xatcho'pdan olib tashlandi");
  } catch (error) {
    next(error);
  }
};
