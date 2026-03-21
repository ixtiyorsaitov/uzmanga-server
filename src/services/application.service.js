const Application = require("../models/Application");

/**
 * Manga yaratish uchun ariza yuborish
 */
exports.createMangaApplication = async ({ userId, message, mangaId }) => {
  return await Application.create({
    user: userId,
    type: "create-manga",
    status: "pending",
    experience: message,
    manga: mangaId,
  });
};

