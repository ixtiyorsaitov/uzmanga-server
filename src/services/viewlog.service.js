const mongoose = require("mongoose");
const ViewLog = require("../models/ViewLog");

exports.recordUniversalView = async (req, targetId, targetModel) => {
  try {
    const viewerId = req.user ? req.user._id : null;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // ViewLog dan qidiramiz: bu odam/IP shu narsani oxirgi 24 soatda ko'rganmi?
    const query = viewerId
      ? { viewer: viewerId, targetId, targetModel }
      : { ipAddress, targetId, targetModel };

    // Oxirgi ko'rgan vaqtini topamiz (faqat eng oxirgisini)
    const lastView = await ViewLog.findOne(query).sort({ createdAt: -1 });

    const NOW = new Date();
    const COOLDOWN_HOURS = 24;
    let isNewView = false;

    if (!lastView) {
      isNewView = true;
    } else {
      const hoursSinceLastView = Math.abs(NOW - lastView.createdAt) / 36e5;
      if (hoursSinceLastView > COOLDOWN_HOURS) {
        isNewView = true;
      }
    }

    // Agar rostdan ham yangi view bo'lsa (24 soat o'tgan bo'lsa yoki umuman ko'rmagan bo'lsa)
    if (isNewView) {
      // 1. Yangi log yozamiz
      await ViewLog.create({
        viewer: viewerId,
        ipAddress: viewerId ? null : ipAddress,
        targetId,
        targetModel,
      });

      // 2. Target modelning (Manga/Chapter/User) o'zida stats.views ni +1 qilamiz
      const Model = mongoose.model(targetModel);

      // Asinxron yangilash (kutib o'tirmaymiz)
      Model.findByIdAndUpdate(targetId, {
        $inc: { "stats.views": 1 },
      }).exec();
    }

    return true; // Hammasi joyida
  } catch (error) {
    console.error("View xatosi:", error);
    return false;
  }
};
