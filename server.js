require("dotenv").config();
const app = require("./src/app");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;
const DB_URI = process.env.MONGODB_URI;

mongoose
  .connect(DB_URI)
  .then(() => {
    console.log("✅ MongoDB-ga muvaffaqiyatli ulanish hosil qilindi");
    app.listen(PORT, () => {
      console.log(`🚀 Server http://localhost:${PORT} manzilida ishlamoqda`);
    });
  })
  .catch((err) => {
    console.error(`❌ Ma'lumotlar bazasida xatolik: ${err.message}`);
    process.exit(1); // Xatolik bo'lsa jarayonni to'xtatish
  });
