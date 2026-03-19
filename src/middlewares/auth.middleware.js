const jwt = require("jsonwebtoken");
const ApiResponse = require("../utils/response");
const User = require("../models/User");

const signAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "15m" });
};

exports.protect = async (req, res, next) => {
  try {
    let accessToken = req.cookies?.access_token;
    const refreshToken = req.cookies?.refresh_token;

    // 1. Ikkala token ham yo'q bo'lsa
    if (!accessToken && !refreshToken) {
      return ApiResponse.error(res, "Siz tizimga kirmagansiz.", 401);
    }

    // 2. Access Tokenni tekshirib ko'ramiz
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
        const currentUser = await User.findById(decoded.id);

        if (currentUser) {
          req.user = currentUser;
          return next(); // Hamma narsa yaxshi
        }
      } catch (error) {
        // Agar xato "muddati o'tgan"dan boshqa narsa bo'lsa (masalan, soxta token)
        if (error.name !== "TokenExpiredError") {
          return ApiResponse.error(res, "Token yaroqsiz.", 401);
        }
        // Agar muddati o'tgan bo'lsa, pastdagi Refresh mantiqiga o'tadi
      }
    }

    // 3. Silent Refresh - Agar access token yo'q yoki muddati o'tgan bo'lsa
    if (!refreshToken) {
      return ApiResponse.error(res, "Seans muddati tugagan.", 401);
    }

    try {
      const decodedRefresh = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET,
      );
      const currentUser = await User.findById(decodedRefresh.id);

      if (!currentUser) {
        return ApiResponse.error(res, "Foydalanuvchi topilmadi.", 401);
      }

      // Yangi Access Token yaratish
      const newAccessToken = signAccessToken(currentUser._id);

      // Cookie-ni yangilash
      res.cookie("access_token", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 1000, // 15 minut
      });

      req.user = currentUser;
      next(); // So'rov muvaffaqiyatli davom etadi
    } catch (refreshError) {
      return ApiResponse.error(
        res,
        "Refresh token yaroqsiz, qayta kiring.",
        401,
      );
    }
  } catch (error) {
    next(error);
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
    const accessToken = req.cookies?.access_token;
    const refreshToken = req.cookies?.refresh_token;

    if (!accessToken && !refreshToken) return next();

    try {
      // Access tokenni tekshirish
      if (accessToken) {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user) {
          req.user = user;
          return next();
        }
      }
    } catch (err) {
      // Access token o'lgan bo'lsa, refreshni ko'ramiz
    }

    if (refreshToken) {
      try {
        const decodedRefresh = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET,
        );
        const user = await User.findById(decodedRefresh.id);
        if (user) {
          const newAccessToken = signAccessToken(user._id);
          res.cookie("access_token", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 15 * 60 * 1000,
          });
          req.user = user;
        }
      } catch (err) {
        // Refresh ham o'lgan bo'lsa, hech narsa qilmaymiz (mehmon sifatida o'tadi)
      }
    }
    next();
  } catch (error) {
    next();
  }
};
