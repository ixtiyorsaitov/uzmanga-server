const mongoose = require("mongoose");

const timeToLive = 30 * 24 * 60 * 60; // 30 days
const viewLogSchema = new mongoose.Schema(
  {
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    ipAddress: {
      type: String,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "targetModel",
    },
    targetModel: {
      type: String,
      required: true,
      enum: ["Manga", "Chapter", "User"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: timeToLive,
    },
  },
  { timestamps: true },
);

viewLogSchema.index({ viewer: 1, targetId: 1, targetModel: 1 });
viewLogSchema.index({ ipAddress: 1, targetId: 1, targetModel: 1 });

module.exports = mongoose.model("ViewLog", viewLogSchema);
