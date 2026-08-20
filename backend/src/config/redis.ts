import IORedis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (error) => logger.error("Redis error", { error: error.message }));

export async function pingRedis(): Promise<boolean> {
  const result = await redis.ping();
  return result === "PONG";
}
