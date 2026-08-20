import mongoose from "mongoose";
import { pingRedis } from "../config/redis";

export const healthService = {
  async live() {
    return {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  },

  async ready() {
    const mongo = mongoose.connection.readyState === 1;
    let redis = false;
    try {
      redis = await pingRedis();
    } catch {
      redis = false;
    }

    return {
      status: mongo && redis ? "ready" : "degraded",
      mongo,
      redis,
      timestamp: new Date().toISOString(),
    };
  },
};
