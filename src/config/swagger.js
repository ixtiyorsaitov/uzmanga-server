const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "UzManga API Documentation",
      version: "1.0.0",
      description: "Manga loyihasi uchun backend API hujjatlari",
    },
    servers: [
      {
        url: "http://localhost:5000/api/v1",
      },
    ],
  },
  apis: ["./src/docs/*.swagger.yaml"],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
