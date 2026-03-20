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
      required: [
        true,
        "Tarjima namunangizga havola (Google Drive/Telegram) yuboring",
      ],
    },
    experience: {
      type: String,
      required: [true, "Tajribangiz haqida qisqacha ma'lumot bering"],
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
