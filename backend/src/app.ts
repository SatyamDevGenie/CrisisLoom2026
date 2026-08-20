import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { env, corsOrigins } from "./config/env";
import { swaggerSpec } from "./docs/swagger";
import { requestId, httpLogger } from "./middleware/requestLogger.middleware";
import { globalLimiter } from "./middleware/rateLimit.middleware";
import { errorHandler, notFound } from "./middleware/error.middleware";
import routes from "./routes";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(requestId);
  app.use(httpLogger);
  app.use(globalLimiter);

  app.get("/", (_req, res) => {
    res.json({
      success: true,
      statusCode: 200,
      message: "CrisisLoom backend is running",
      data: {
        status: "ok",
        health: `${env.API_PREFIX}/health`,
        docs: "/api/docs",
      },
    });
  });

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec));

  app.use(env.API_PREFIX, routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
