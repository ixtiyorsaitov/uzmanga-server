const {
  getGoogleAuthUrl,
  getGoogleUser,
} = require("../services/googleAuth.service");

exports.googleLogin = (req, res) => {
  const url = getGoogleAuthUrl();
  res.status(200).json({ url });
};

exports.googleCallback = async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: "Code not provided" });
    }

    const googleUser = await getGoogleUser(code);
    console.log("✅ Google user:", googleUser);

    // TODO: userService.loginWithGoogle(googleUser)

    res.redirect(process.env.FRONTEND_URL);
  } catch (err) {
    next(err);
  }
};
