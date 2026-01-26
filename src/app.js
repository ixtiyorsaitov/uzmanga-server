const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const errorHandler = require("./middlewares/errorHandler");

const mangaRoutes = require("./routes/mangaRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

// --- Middlewares ---
app.use(helmet()); // Security headers
app.use(cors()); // Cross-Origin Resource Sharing
app.use(morgan("dev")); // Log requests
app.use(express.json()); // Read JSON data
app.use(express.urlencoded({ extended: true }));
// app.use("/uploads", express.static("uploads")); // Static images

// --- Swagger UI ---
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- API Routes ---
app.use("/api/v1/mangas", mangaRoutes);
app.use("/api/v1/auth", authRoutes);

// --- Catch errors (404) ---
app.use((req, res, next) => {
  const error = new Error("Resurs topilmadi");
  error.status = 404;
  next(error);
});

// --- Error handler ---
app.use(errorHandler);

module.exports = app;
