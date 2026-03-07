const Like = require("../models/Like");

exports.attachUserReactions = async (comments, userId) => {
  // 1. Agar izohlar yo'q bo'lsa yoki foydalanuvchi tizimga kirmagan bo'lsa
  if (!comments.length || !userId) {
    return comments.map((comment) => ({ ...comment, userReaction: null }));
  }

  // 2. Barcha izohlarning ID larini bitta massivga yig'ib olamiz
  const commentIds = comments.map((comment) => comment._id);

  // 3. Faqat shu izohlarga tegishli va joriy userga tegishli likelarni BITTADA olamiz
  const userLikes = await Like.find({
    user: userId,
    targetType: "Comment",
    targetId: { $in: commentIds }, // Eng optimal joyi shu yerda
  }).lean();

  // 4. Qidirish tezligi O(1) bo'lishi uchun Object (Dictionary) yaratamiz
  const reactionMap = {};
  userLikes.forEach((like) => {
    reactionMap[like.targetId.toString()] = like.value;
  });

  // 5. Har bir izohga mos reaksiyani yopishtirib qaytaramiz
  return comments.map((comment) => ({
    ...comment,
    userReaction: reactionMap[comment._id.toString()] || null,
  }));
};
