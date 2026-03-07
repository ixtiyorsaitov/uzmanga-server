const jwt = require("jsonwebtoken");
const ApiResponse = require("../utils/response");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  try {
    // 1. Tokenni olish (Cookie yoki Authorization Header orqali)
    let token;
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return ApiResponse.error(
        res,
        "Siz tizimga kirmagansiz. Iltimos, login qiling.",
        401,
      );
    }

    // 2. Tokenni tekshirish (Verify)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Foydalanuvchi hali ham bazada bormi?
    // (Senior darajada token borligi yetarli emas, foydalanuvchi o'chirilgan bo'lishi mumkin)
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return ApiResponse.error(
        res,
        "Ushbu token egasi bo'lgan foydalanuvchi tizimda mavjud emas.",
        401,
      );
    }

    // 4. Foydalanuvchini req obyektiga biriktirish
    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return ApiResponse.error(
        res,
        "Token muddati tugagan. Iltimos, qayta kiring.",
        401,
      );
    }
    return ApiResponse.error(res, "Avtorizatsiyadan o'tib bo'lmadi.", 401);
  }
};

/**
 * Rollarni tekshirish (Admin, Moderator va h.k.)
 * @param  {...string} roles - Ruxsat berilgan rollar ro'yxati
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // req.user protect middleware'dan keladi
    if (!roles.includes(req.user.role)) {
      return ApiResponse.error(
        res,
        `Sizda ushbu amalni bajarish uchun ruxsat yo'q`,
        403,
      );
    }
    next();
  };
};

exports.optionalProtect = async (req, res, next) => {
  try {
    let token;
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // Agar token umuman yo'q bo'lsa, mehmon sifatida o'tkazib yuboramiz
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);

    // Agar foydalanuvchi topilsa, uni req.user ga yopishtiramiz
    if (currentUser) {
      req.user = currentUser;
    }

    next();
  } catch (error) {
    // Token eskirgan yoki xato bo'lsa ham dastur to'xtamasligi kerak,
    // shunchaki user tizimga kirmagan deb hisoblab o'tkazib yuboramiz.
    next();
  }
};
