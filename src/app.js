const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const errorHandler = require("./middlewares/error.handler.middleware");
const cookieParser = require("cookie-parser");
require("./config/passport");

const mangaRoutes = require("./routes/manga.routes");
const authRoutes = require("./routes/auth.routes");
const categoryRoutes = require("./routes/category.routes");
const genreRoutes = require("./routes/genre.routes");
const chapterRoutes = require("./routes/chapter.routes");
const mangaStatusRoutes = require("./routes/manga.status.routes");
const translationStatusRoutes = require("./routes/translation.status.routes");
const ageRatingRoutes = require("./routes/age.rating.routes");
const mangaTypesRoutes = require("./routes/manga.types.routes");
const commentRoutes = require("./routes/comment.routes");
const bookmarkRoutes = require("./routes/bookmark.routes");
const userRoutes = require("./routes/user.routes");
const applicationRoutes = require("./routes/application.routes");

const allowedOrigins = [
  "https://uzmanga-auth.vercel.app",
  "http://localhost:3000",
  "http://localhost:5000",
  process.env.FRONTEND_URL,
  process.env.APP_URL,
];

const app = express();

app.set("trust proxy", true);

// --- Middlewares ---
app.use(helmet());
app.use(cookieParser());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("CORS siyosati tomonidan bloklandi"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads")); // Static images

// --- Swagger UI ---
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- API Routes ---
app.use("/api/v1/mangas", mangaRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/genres", genreRoutes);
app.use("/api/v1/chapters", chapterRoutes);
app.use("/api/v1/manga-statuses", mangaStatusRoutes);
app.use("/api/v1/translation-statuses", translationStatusRoutes);
app.use("/api/v1/age-ratings", ageRatingRoutes);
app.use("/api/v1/manga-types", mangaTypesRoutes);
app.use("/api/v1/comments", commentRoutes);
app.use("/api/v1/bookmarks", bookmarkRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/applications", applicationRoutes);

// --- Catch errors (404) ---
app.use((req, res, next) => {
  const error = new Error("Resurs topilmadi");
  error.status = 404;
  next(error);
});

// --- Error handler ---
app.use(errorHandler);

module.exports = app;
