const jwt = require("jsonwebtoken");
const ApiResponse = require("../utils/response");

exports.protect = async (req, res, next) => {
  try {
    const token = req.cookies.access_token;

    if (!token) {
      return ApiResponse.error(res, "Not authorized, no token", 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return ApiResponse.error(res, "Not authorized, invalid token", 401);
  }
};
