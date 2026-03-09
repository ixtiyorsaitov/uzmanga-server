const errorHandler = (err, req, res, next) => {
  console.log(err);

  let error = { ...err };
  error.message = err.message;

  // 1. Mongoose yomon ID xatosi (CastError)
  if (err.name === "CastError") {
    error.message = `Resurs topilmadi: noto'g'ri ID formati`;
    return res.status(404).json({ success: false, message: error.message });
  }

  // 2. Mongoose Validation xatosi (Sizdagi holat)
  if (err.name === "ValidationError") {
    // Xatolarni massivga aylantirib, faqat xabarlarni ajratib olamiz
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    return res.status(400).json({
      success: false,
      message: message, // "Manga nomi bo'sh bo'lishi mumkin emas" va h.k.
    });
  }

  // 3. Mongoose Dublikat ma'lumot xatosi (masalan, bir xil nomli manga)
  if (err.code === 11000) {
    error.message = "Bunday ma'lumot tizimda mavjud";
    return res.status(400).json({ success: false, message: error.message });
  }

  // Umumiy kutilmagan xatolar
  res.status(err.status || 500).json({
    success: false,
    message: error.message || "Server xatosi",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

module.exports = errorHandler;
