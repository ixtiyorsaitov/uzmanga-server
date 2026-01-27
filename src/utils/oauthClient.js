const { OAuth2Client } = require("google-auth-library");

const REDIRECT_URI = `${process.env.APP_URL}/api/v1/auth`;

const createOAuthClient = () =>
  new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI,
  );

module.exports = createOAuthClient;
