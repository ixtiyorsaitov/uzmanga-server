const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },

    password: {
      type: String,
      required: false,
      select: false,
    },

    google_id: {
      type: String,
      unique: true,
      sparse: true,
    },

    provider: {
      type: String,
      enum: ["telegram", "google"],
      required: true,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    name: String,
    avatar: String,
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  // Agar parol o'zgarmagan bo'lsa yoki parol kiritilmagan bo'lsa (Google login holati)
  if (!this.isModified("password") || !this.password) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

module.exports = mongoose.model("User", userSchema);
