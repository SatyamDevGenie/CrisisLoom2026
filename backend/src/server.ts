import fs from "fs";
import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { connectDatabase } from "./config/database";
import { redis, waitForRedis } from "./config/redis";
import { initSockets } from "./sockets/setup";
import { startWorkers } from "./workers";

if (!fs.existsSync("logs")) {
  fs.mkdirSync("logs", { recursive: true });
}

async function bootstrap() {
  await connectDatabase();
  await waitForRedis();

  const app = createApp();
  const server = http.createServer(app);
  initSockets(server);
  startWorkers();

  server.listen(env.PORT, () => {
    logger.info(`API running on port ${env.PORT}`);
    logger.info(`Test route: http://localhost:${env.PORT}/`);
    logger.info(`Swagger docs at http://localhost:${env.PORT}/api/docs`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down`);
    server.close(async () => {
      await redis.quit();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

bootstrap().catch((error) => {
  logger.error("Failed to start server", { error });
  process.exit(1);
});
