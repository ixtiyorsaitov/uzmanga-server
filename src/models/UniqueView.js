const mongoose = require("mongoose");
const { Schema } = mongoose;

const uniqueViewHistorySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "targetModel",
    },
    targetModel: {
      type: String,
      required: true,
      enum: ["Manga", "Chapter", "User", "Article"],
    },
    parentManga: {
      type: Schema.Types.ObjectId,
      ref: "Manga",
    },
  },
  { timestamps: true },
);

uniqueViewHistorySchema.index(
  { user: 1, targetId: 1, targetModel: 1 },
  { unique: true },
);

uniqueViewHistorySchema.index({ user: 1, parentManga: 1, targetModel: 1 });

module.exports = mongoose.model("UniqueViewHistory", uniqueViewHistorySchema);
