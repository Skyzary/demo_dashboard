import express from "express";
import cors from "cors";
import logger from "./utils/logger.ts";
import { AuthService } from "./auth/AuthService.ts";
import pinoHttp from "pino-http";
import { router as authRouter } from "./auth/authController.ts";
import { moodleRouter } from "./moodle/moodleController.ts";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./utils/swagger.ts";

const app = express();
logger.info("Server started");
app.use(cors());
const authService = new AuthService();
app.use(express.json({ limit: '50mb' }));
app.use(
  pinoHttp({
    logger
  })
);

app.use("/login", authRouter);
app.use("/moodle", moodleRouter);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(3000, () => {
  logger.info("Server started on port 3000");
  logger.info("Swagger documentation available at http://localhost:3000/api-docs");
});

logger.info("Server started");
