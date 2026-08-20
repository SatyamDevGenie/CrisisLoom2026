import { redis } from "../config/redis";
import { logger } from "../config/logger";

export const cacheService = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  },

  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  async delByPrefix(prefix: string): Promise<void> {
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length) {
      await redis.del(...keys);
      logger.debug("Cache prefix cleared", { prefix, count: keys.length });
    }
  },
};
