const User = require("../models/User");
const { getGoogleAuthUrl, getGoogleUser } = require("../services/auth.service");
const jwt = require("jsonwebtoken");

exports.googleLogin = (req, res) => {
  const url = getGoogleAuthUrl();
  res.status(200).json({ url });
};

exports.googleCallback = async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: "Code missing" });

    const googleUser = await getGoogleUser(code);

    // 1. Foydalanuvchini qidirish yoki yaratish
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

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      // domain: ".uzmanga.uz",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect(process.env.FRONTEND_URL || "http://localhost:3000");
  } catch (err) {
    console.error("GOOGLE AUTH ERROR:", err);
    res.status(500).send("Serverda xatolik yuz berdi");
  }
};
