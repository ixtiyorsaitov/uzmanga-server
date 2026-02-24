const mongoose = require("mongoose");

const genreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Janr nomi bo'lishi shart"],
      trim: true,
      unique: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Genre", genreSchema);
