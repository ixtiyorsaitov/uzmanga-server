const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
    },
    portfolioLink: {
      type: String,
    },
    experience: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    type: {
      type: String,
      enum: ["translator", "create-manga"],
      required: true,
    },
    manga: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manga",
    },
    adminComment: {
      type: String,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Application", applicationSchema);
