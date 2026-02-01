const User = require("../models/User");
const { getGoogleAuthUrl, getGoogleUser } = require("../services/auth.service");
const jwt = require("jsonwebtoken");
const ApiResponse = require("../utils/response");

// 1️⃣ Google Login - URL qaytarish
exports.googleLogin = (req, res) => {
  try {
    const url = getGoogleAuthUrl();

    return ApiResponse.success(res, { url }, "Google OAuth URL generated");
  } catch (error) {
    console.error("Google Login Error:", error);
    return ApiResponse.error(res, "Failed to generate OAuth URL", 500);
  }
};

// 2️⃣ Google Callback - Token cookie'da
exports.googleCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/error?message=Code missing`,
      );
    }

    const googleUser = await getGoogleUser(code);

    let user = await User.findOne({
      $or: [{ google_id: googleUser.id }, { email: googleUser.email }],
    });

    if (!user) {
      user = await User.create({
        name: googleUser.name,
        email: googleUser.email,
        avatar: googleUser.picture,
        google_id: googleUser.id,
        provider: "google",
      });
    }

    // Access token (qisqa muddatli)
    const accessToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    // Refresh token (uzoq muddatli)
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );

    // ✅ COOKIE'da saqlash (XAVFSIZ)
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // ✅ TOKEN YO'Q redirect
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback`);
  } catch (err) {
    console.error("GOOGLE AUTH ERROR:", err);
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/error?message=Authentication failed`,
    );
  }
};

// 3️⃣ Get Current User
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-google_id");

    if (!user) {
      return ApiResponse.error(res, "User not found", 404);
    }

    return ApiResponse.success(res, { user }, "User retrieved successfully");
  } catch (error) {
    console.error("Get Me Error:", error);
    return ApiResponse.error(res, "Failed to retrieve user", 500);
  }
};

// 4️⃣ Refresh Token
exports.refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.cookies;

    if (!refresh_token) {
      return ApiResponse.error(res, "Refresh token not found", 401);
    }

    const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);

    const newAccessToken = jwt.sign(
      { id: decoded.id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    res.cookie("access_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    return ApiResponse.success(res, null, "Token refreshed successfully");
  } catch (error) {
    console.error("Refresh Token Error:", error);
    return ApiResponse.error(res, "Invalid refresh token", 401);
  }
};

// 5️⃣ Logout
exports.logout = (req, res) => {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");

  return ApiResponse.success(res, null, "Logged out successfully");
};
