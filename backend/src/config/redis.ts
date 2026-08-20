import IORedis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

let redisErrorLogged = false;

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 3000);
    if (times === 1 || times % 10 === 0) {
      logger.warn("Waiting for Redis. Start it with: docker compose up redis -d", {
        attempt: times,
      });
    }
    return delay;
  },
});

redis.on("connect", () => {
  redisErrorLogged = false;
  logger.info("Redis connected");
});

redis.on("error", (error) => {
  if (redisErrorLogged) return;
  redisErrorLogged = true;
  logger.error("Redis is not running on 127.0.0.1:6379", {
    error: error.message,
    hint: "Run: docker compose up redis -d",
  });
});

export async function pingRedis(): Promise<boolean> {
  const result = await redis.ping();
  return result === "PONG";
}

export async function waitForRedis(timeoutMs = 15000): Promise<void> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      if ((await redis.ping()) === "PONG") return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(
    "Redis is required but not running. Start it with: docker compose up redis -d"
  );
}
