const { google } = require("googleapis");
const createOAuthClient = require("../utils/oauthClient");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const getGoogleAuthUrl = () => {
  const client = createOAuthClient();

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["openid", "profile", "email"],
  });
};

const getGoogleUser = async (code) => {
  const client = createOAuthClient();

  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2" });
  const { data } = await oauth2.userinfo.get({
    auth: client,
  });

  return data;
};



module.exports = {
  getGoogleAuthUrl,
  getGoogleUser,
};
