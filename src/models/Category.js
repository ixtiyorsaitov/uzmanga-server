const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Kategoriya nomi bo'lishi shart"],
      trim: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Category", categorySchema);
