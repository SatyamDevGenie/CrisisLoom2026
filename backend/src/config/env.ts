import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  API_PREFIX: z.string().default("/api/v1"),
  MONGO_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "debug"]).default("info"),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().default("CrisisLoom <no-reply@crisisloom.local>"),
  TWILIO_ACCOUNT_SID: z.string().optional().default(""),
  TWILIO_AUTH_TOKEN: z.string().optional().default(""),
  TWILIO_PHONE_NUMBER: z.string().optional().default(""),
  SEED_ADMIN_EMAIL: z.string().email().default("admin@crisisloom.local"),
  SEED_ADMIN_PASSWORD: z.string().min(8).default("Admin@12345"),
  DEFAULT_MATCH_RADIUS_METERS: z.coerce.number().default(10000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
