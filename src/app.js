const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const errorHandler = require("./middlewares/errorHandler");
const passport = require("passport");
const session = require("cookie-session");
require("./config/passport"); // Passport sozlamalari

const mangaRoutes = require("./routes/mangaRoutes");
const authRoutes = require("./routes/authRoutes");

const allowedOrigins = [
  "https://uzmanga-auth.vercel.app",
  "http://localhost:3000",
];

const app = express();

// --- Middlewares ---
app.use(helmet());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("CORS siyosati tomonidan bloklandi"));
      }
    },
    credentials: true, // Cookie o'tishi uchun shart!
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
// Cross-Origin Resource Sharing
app.use(morgan("dev")); // Log requests
app.use(express.json()); // Read JSON data
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    maxAge: 24 * 60 * 60 * 1000, // 1 kun
    keys: [process.env.SESSION_KEY],
  }),
);
app.use(passport.initialize());
app.use(passport.session());
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
